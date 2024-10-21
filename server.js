import http from 'node:http';
import fs from 'node:fs';
import { URL } from 'node:url';

const file_data = 'users.json';
let users = [];

try {
  const data = fs.readFileSync(file_data, 'utf8');
  users = JSON.parse(data);
  console.log('Users loaded from file');
} catch (err) {
  console.log('Data file not found');
}

function saveUsers() {
  fs.writeFile(file_data, JSON.stringify(users, null, 2), (err) => {
    if (err) {
      console.log('Error saving users:', err)
    }
  })
}

function generatedId() {
  const ids = users.map(u => u.id);
  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  return maxId + 1;
}

const server = http.createServer(handleRequests);

const HOST = '127.0.0.1';
const PORT = 3000;

server.listen(PORT, HOST, () => {
  console.log(`Server is running on ${HOST}:${PORT}`);
});

function handleRequests(req, res) {
  const { method, url, headers } = req;
  const reqUrl = new URL(url, `http://${headers.host}`);
  const pathname = reqUrl.pathname;
  const searchParams = reqUrl.searchParams;
  
  const route = pathname.split('/').filter(Boolean);

  if (route[0] === 'users') {
    if (method === 'GET') {
      if (route.length === 1) {
        handleGetUsers(req, res, searchParams);
      } else if (route.length === 2) {
        handleGetUserById(req, res, route[1]);
      } else {
        res.statusCode = 404;
        res.end('Not Found');
      }
    } else if (method === 'POST' && route.length === 1) {
      handleCreateUser(req, res);
    } else if ((method === 'PUT' || method === 'PATCH') && route.length === 2) {
      if (method === 'PUT') {
        handleUpsertUser(req, res, route[1]);
      } else {
        handlePatchUser(req, res, route[1]);
      }
    } else if (method === 'DELETE' && route.length === 2) {
      handleDeleteUser(req, res, route[1]);
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
}

function handleGetUsers(req, res, searchParams) {
  let filtered_users = users;
  const name = searchParams.get('name');
  const minAge = parseInt(searchParams.get('minAge'));
  const maxAge = parseInt(searchParams.get('maxAge'));

  if (name) {
    filtered_users = filtered_users.filter((user) => user.name === name);
  }

  if (!isNaN(minAge)) {
    filtered_users = filtered_users.filter((user) => user.age >= minAge);
  }

  if (!isNaN(maxAge)) {
    filtered_users = filtered_users.filter((user) => user.age <= maxAge); 
  }

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(filtered_users));
}

function handleGetUserById(req, res, id) {
  const user = users.find((u) => u.id === parseInt(id));

  if (user) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(user));
  } else {
    res.statusCode = 404;
    res.end('User not found');
  }
}

function handleCreateUser(req, res) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', () => {
    try {
      const userData = JSON.parse(body);
      const user = { id: generatedId(), ...userData };
      users.push(user);
      saveUsers();
      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(user));
    } catch (error) {
      res.statusCode = 400;
      res.end('Invalid JSON');
    }
  })
}

function handleUpsertUser(req, res, id) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', () => {
    try {
      const userData = JSON.parse(body);
      let user = users.find((u) => u.id === parseInt(id));
      if (user) {
        Object.assign(user, userData, { id : parseInt(id)})
      } else {
        user = { id: parseInt(id), ...userData };
        users.push(user);
      }
      saveUsers();
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(user));
    } catch (error) {
      res.statusCode = 400;
      res.end('Invalid JSON');
    }
  })
}


function handlePatchUser(req, res, id) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
  
    req.on('end', () => {
      try {
        const userData = JSON.parse(body);
        let user = users.find((u) => u.id === parseInt(id));
        if (user) {
          Object.assign(user, userData);
          saveUsers();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(user));
        } else {
          res.statusCode = 404;
          res.end('User not found');
        } 
      } catch (error) {
        res.statusCode = 400;
        res.end('Invalid JSON');
      }
    })
}
  
function handleDeleteUser(req, res, id) {
    const user_index = users.findIndex((u) => u.id === parseInt(id));
  
    if (user_index !== -1) {
      users.splice(user_index, 1);
      saveUsers();
      res.statusCode = 204;
      res.end();
    } else {
      res.statusCode = 404;
      res.end('User not found');
    }
}
  