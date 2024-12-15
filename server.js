const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const xlsx = require('xlsx');
const bcrypt = require('bcrypt');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
require('dotenv').config();
// Configuración de MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,  
});
db.connect(err => {
  if (err) throw err;
  console.log('Conectado a la base de datos');
});
// Configuración de Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'secretKey',
  resave: false,
  saveUninitialized: false,
}));
const upload = multer({ dest: 'uploads/' });
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/logan');
  }
  next();
}
function requireRole(role) {
  return (req, res, next) => {
      if (req.session.user && role.includes(req.session.user.tipo_usuario)) {
          next();
      } else {
        res.sendFile(path.join(__dirname, 'public', 'error.html'));
      }
  };
}
app.post('/upload', requireLogin, requireRole(['medico', 'administrador']), upload.single('excelFile'), (req, res) => {
  const filePath = req.file.path;
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  let errores = 0;

  data.forEach((row, index) => {
    const { nombre, descripcion } = row;
    const sql = `INSERT INTO equipos (nombre, descripcion) VALUES (?, ?)`;
    db.query(sql, [nombre, descripcion], err => {
      if (err) {
        errores++;
      }
      // Cuando se procesen todas las filas, envía la respuesta
      if (index === data.length - 1) {
        if (errores > 0) {
          res.sendFile(path.join(__dirname, 'public', 'error.html'));
        } else {
          res.sendFile(path.join(__dirname, 'public', 'equipos.html'));
        }
      }
    });
  });
});

app.get('/download', requireLogin,requireRole(['medico','administrador']), (req, res) =>{
    const sql = `SELECT * FROM equipos`;
    db.query(sql, (err, results) => {
      if (err) {        
        res.sendFile(path.join(__dirname, 'public', 'error.html'));
      }
  
      const worksheet = xlsx.utils.json_to_sheet(results);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Equipos');
  
      const filePath = path.join(__dirname, 'uploads', 'equipos.xlsx');
      xlsx.writeFile(workbook, filePath);
      res.download(filePath, 'equipos.xlsx');
    });
});
app.get('/buscar', requireLogin,requireRole('administrador'),(req, res) => {
    const query = req.query.query;
    const sql = `SELECT nombre_usuario FROM usuarios WHERE nombre_usuario LIKE ?`;
    db.query(sql, [`%${query}%`], (err, results) => {
      if (err) {
        res.sendFile(path.join(__dirname, 'public', 'error.html'));
      }
      res.json(results);
    });
});
app.get('/menu', (req, res) => {
    const menuItems = [
      { nombre: 'Inicio', url: '/index.html' },
      { nombre: 'Equipos', url: '/equipos.html' },
      { nombre: 'Usuarios', url: '/usuarios.html' },
      { nombre: 'Búsqueda', url: '/busqueda.html' }
    ];
    res.json(menuItems);
});
app.get('/ver-equipos',requireLogin,requireRole(['medico','administrador']),(req, res) => {
    db.query('SELECT * FROM equipos', (err, results) => {
        if (err) {
        res.sendFile(path.join(__dirname, 'public', 'error.html'));
        }
    
        let html = `
        <html>
        <head>
            <link rel="stylesheet" href="/styles.css">
            <title>Equipos Guardados</title>
        </head>
        <body>
            <h1>Equipos</h1>
            <table>
            <thead>
                <tr>
                <th>Nombre</th>
                <th>Descripcion</th>
                </tr>
            </thead>
            <tbody>
        `;
    
        results.forEach(equipo => {
        html += `
            <tr>
            <td>${equipo.nombre}</td>
            <td>${equipo.descripcion}</td>
            </tr>
        `;
        });
    
        html += `
            </tbody>
            </table>
            <button onclick="window.location.href='/equipos'">Volver</button>
        </body>
        </html>
        `;
        res.send(html);
    });
});
app.get('/ver-usuarios',requireLogin,requireRole('administrador'),(req, res) => {
db.query('SELECT * FROM usuarios', (err, results) => {
    if (err) {
    res.sendFile(path.join(__dirname, 'public', 'error.html'));
    }

    let html = `
    <html>
    <head>
        <link rel="stylesheet" href="/styles.css">
        <title>Usuarios</title>
    </head>
    <body>
        <h1>Usuarios Registrados</h1>
        <table>
        <thead>
            <tr>
            <th>Id</th>
            <th>Nombre</th>
            <th>Rol</th>
            </tr>
        </thead>
        <tbody>
    `;

    results.forEach(usuario => {
    html += `
        <tr>
        <td>${usuario.id}</td>
        <td>${usuario.nombre_usuario}</td>
        <td>${usuario.tipo_usuario}</td>
        </tr>
    `;
    });

    html += `
        </tbody>
        </table>
        <button onclick="window.location.href='/'">Volver</button>
    </body>
    </html>
    `;
    res.send(html);
});
});
app.post('/last-date', requireLogin,requireRole(['medico','administrador']), (req, res) => {
  const { date, paciente_name } = req.body;
  const query = 'update pacientes set ult_cit = ? where nombre like ?';
  db.query(query, [date, paciente_name], (err, result) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'public', 'error.html'));
    }
    res.sendFile(path.join(__dirname, 'public', 'pacientes.html'));
  });
});
app.post('/insertar-medico', requireLogin,requireRole('administrador'), (req, res) => {
  const { medico_name,medico_surname, especialidad } = req.body;
  const query = 'INSERT INTO medicos (nombre, apellido, especialidad) VALUES (?, ?, ?)';

  db.query(query, [medico_name,medico_surname, especialidad], (err, result) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'public', 'error.html'));
    }
    res.sendFile(path.join(__dirname, 'public', 'regmed.html'));
  });
});
app.post('/submit-data', requireLogin,requireRole(['medico','administrador']), (req, res) => {
  const { name, surname, age, heart_rate, height, weight, date } = req.body;

  const query = 'INSERT INTO pacientes (nombre, apellido, edad, frecuencia_cardiaca, altura, peso, ult_cit) VALUES (?, ?, ?, ?, ?, ?, ?)';
  db.query(query, [name, surname, age, heart_rate, height, weight, date], (err, result) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'public', 'error.html'));
    }
    res.sendFile(path.join(__dirname, 'public', 'pacientes.html'));
  });
});
app.post('/registrar', async (req, res) => {
  const { username, password, tipo_usuario } = req.body;
  const passwordHash = await bcrypt.hash(password, 10);

  db.query('INSERT INTO usuarios (nombre_usuario, password_hash, tipo_usuario) VALUES (?, ?, ?)', 
    [username, passwordHash, tipo_usuario], (err) => {
    if (err) {
      return res.send('Error al registrar el usuario.');
    }
    res.redirect('/logan');
  });
});
app.post('/login', (req, res) => {
  const { nombre_usuario, password } = req.body;

  db.query('SELECT * FROM usuarios WHERE nombre_usuario = ?', 
    [nombre_usuario], async (err, results) => {
    if (err || results.length === 0) {
      res.sendFile(path.join(__dirname, 'public', 'registro.html'));
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (match) {
      req.session.user = {
        id: user.id,
        username: user.nombre_usuario,
        tipo_usuario: user.tipo_usuario // Aquí se establece el tipo de usuario en la sesión
    };
      res.redirect('/index');
    } else{
      res.sendFile(path.join(__dirname, 'public', 'error.html'));
    }
  });
});
app.get('/tipo-usuario', requireLogin, (req, res) => {
  res.json({ tipo_usuario: req.session.user.tipo_usuario });
});
app.get('/', requireLogin, (req, res) => {
  console.log(req.session);
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/borrar-medicos', requireLogin, requireRole(['administrador']),(req, res) => {
  console.log(req.query);
  const { name_search, surname_search, job_search } = req.query;
  console.log(name_search,surname_search,job_search);
  let query = 'DELETE FROM medicos WHERE 1=1';

  if (name_search) {
    query += ` AND nombre LIKE '%${name_search}%'`;
  }
  if (surname_search) {
    query += ` AND apellido LIKE '%${surname_search}%'`;
  }
  if (job_search) {
    query += ` AND especialidad LIKE '%${job_search}%'`;
  }

  db.query(query, (err, results) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'public', 'error.html'));
    }
    res.sendFile(path.join(__dirname, 'public', 'regmed.html'));
  });
});
app.get('/borrar-pacientes', requireLogin, requireRole(['medico','administrador']),(req, res) => {
  console.log(req.query);
  const { name_search, surname_search } = req.query;
  console.log(name_search,surname_search);
  let query = 'DELETE FROM pacientes WHERE 1=1';

  if (name_search) {
    query += ` AND nombre LIKE '%${name_search}%'`;
  }
  if (surname_search) {
    query += ` AND apellido LIKE '%${surname_search}%'`;
  }
  db.query(query, (err, results) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'public', 'error.html'));
    }
    res.sendFile(path.join(__dirname, 'public', 'pacientes.html'));
  });
});
app.get('/borrar-usuarios', requireLogin, requireRole('administrador'),(req, res) => {
  console.log(req.query);
  const { name_search, surname_search } = req.query;
  console.log(name_search,surname_search);
  let query = 'DELETE FROM usuarios WHERE 1=1';

  if (name_search) {
    query += ` AND nombre LIKE '%${name_search}%'`;
  }
  if (surname_search) {
    query += ` AND apellido LIKE '%${surname_search}%'`;
  }
  db.query(query, (err, results) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'public', 'error.html'));
    }
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  });
});
app.get('/buscar-pacientes', requireLogin, requireRole(['medico','administrador']),(req, res) => {
  const { name_search, age_search } = req.query;
  let query = 'SELECT * FROM pacientes WHERE 1=1';

  if (name_search) {
    query += ` AND nombre LIKE '%${name_search}%'`;
  }
  if (age_search) {
    query += ` AND edad = ${age_search}`;
  }

  db.query(query, (err, results) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'public', 'error.html'));
    }

    let html = `
      <html>
      <head>
        <link rel="stylesheet" href="/styles.css">
        <title>Resultados de Búsqueda</title>
      </head>
      <body>
        <h1>Resultados de Búsqueda</h1>
        <table>
          <thead>
            <tr>
              <th>id</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Edad</th>
              <th>Frecuencia Cardiaca (bpm)</th>
              <th>Altura</th>
              <th>Peso</th>
            </tr>
          </thead>
          <tbody>
    `;

    results.forEach(paciente => {
      html += `
        <tr>
          <td>${paciente.id}</td>
          <td>${paciente.nombre}</td>
          <td>${paciente.apellido}</td>
          <td>${paciente.edad}</td>
          <td>${paciente.frecuencia_cardiaca}</td>
          <td>${paciente.altura}</td>
          <td>${paciente.peso}</td>
        </tr>
      `;
    });
    html += `
          </tbody>
        </table>
        <button onclick="window.location.href='/pacientes'">Volver</button>
      </body>
      </html>
    `;
    res.send(html);
  });
});
app.get('/ordenar-pacientes', requireLogin,requireRole(['medico','administrador']), (req, res) => {
  const query = 'SELECT * FROM pacientes ORDER BY apellido ASC, nombre ASC';

  db.query(query, (err, results) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'public', 'error.html'));
    }

    let html = `
      <html>
      <head>
        <link rel="stylesheet" href="/styles.css">
        <title>Pacientes Ordenados</title>
      </head>
      <body>
        <h1>Pacientes Ordenados por Apellido</h1>
        <table>
          <thead>
            <tr>
              <th>Id</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Edad</th>
              <th>Frecuencia Cardiaca (bpm)</th>
              <th>Altura</th>
              <th>Peso</th>
              <th>Ultima cita</th>
            </tr>
          </thead>
          <tbody>
    `;

    results.forEach(paciente => {
      html += `
        <tr>
          <td>${paciente.id}</td>
          <td>${paciente.nombre}</td>
          <td>${paciente.apellido}</td>
          <td>${paciente.edad}</td>
          <td>${paciente.frecuencia_cardiaca}</td>
          <td>${paciente.altura}</td>
          <td>${paciente.peso}</td>
          <td>${paciente.ult_cit}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
        <button onclick="window.location.href='/pacientes'">Volver</button>
      </body>
      </html>
    `;

    res.send(html);
  });
});
app.get('/mis-datos', requireLogin,(req, res) => {
  const query = 'SELECT * FROM usuarios where nombre_usuario like ?';
  db.query(query,[req.session.user.username], (err, results) => {
      if (err) {
        res.sendFile(path.join(__dirname, 'public', 'error.html'));
      }
      let html = `
      <html>
      <head>
        <link rel="stylesheet" href="/styles.css">
        <title>Usuarios</title>
      </head>
      <body>
            <!-- Barra de navegación -->
      <header class="navbar">
        <nav>
            <ul>
                <li><a href="/index.html">INICIO</a></li>
                <li><a href="/equipos">EQUIPOS</a></li>
                <li><a href="/pacientes">PACIENTES</a></li>
                <li><a href="/admed">MEDICOS</a></li>
                <li><a href="/logout">CERRAR SESION</a></li>
            </ul>
        </nav>
    </header>
        <h1>Usuarios Registrados</h1>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Rol</th>
            </tr>
          </thead>
          <tbody>
    `;
    results.forEach(usuario => {
      html += `
        <tr>
          <td>${usuario.id}</td>
          <td>${usuario.nombre_usuario}</td>
          <td>${usuario.tipo_usuario}</td>

        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
        <button onclick="window.location.href='/'">Volver</button>
      </body>
      </html>
    `;
      res.send(html);
      
  });
});
app.get('/ver-usuarios', requireLogin, requireRole('administrador'),(req, res) => {
  const query = 'SELECT * FROM usuarios';
  db.query(query, (err, results) => {
      if (err) {
        res.sendFile(path.join(__dirname, 'public', 'error.html'));
      }
      let html = `
      <html>
      <head>
        <link rel="stylesheet" href="/styles.css">
        <title>Usuarios</title>
      </head>
      <body>
        <h1>Usuarios Registrados</h1>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Rol</th>
            </tr>
          </thead>
          <tbody>
    `;
    results.forEach(usuario => {
      html += `
        <tr>
          <td>${usuario.id}</td>
          <td>${usuario.nombre_usuario}</td>
          <td>${usuario.tipo_usuario}</td>

        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
        <button onclick="window.location.href='/admin'">Volver</button>
      </body>
      </html>
    `;
      res.send(html);
      
  });
});
app.get('/ver-pacientes', requireLogin, requireRole(['medico','administrador']),(req, res) => {
  db.query('SELECT * FROM pacientes', (err, results) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'public', 'error.html'));
    }

    let html = `
      <html>
      <head>
        <link rel="stylesheet" href="/styles.css">
        <title>Pacientes</title>
      </head>
      <body>
        <h1>Pacientes Registrados</h1>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Edad</th>
              <th>Frecuencia Cardiaca (bpm)</th>
              <th>Altura</th>
              <th>Peso</th>
              <th>Ultima cita</th>
            </tr>
          </thead>
          <tbody>
    `;
    results.forEach(paciente => {
      html += `
        <tr>
          <td>${paciente.id}</td>
          <td>${paciente.nombre}</td>
          <td>${paciente.apellido}</td>
          <td>${paciente.edad}</td>
          <td>${paciente.frecuencia_cardiaca}</td>
          <td>${paciente.altura}</td>
          <td>${paciente.peso}</td>
          <td>${paciente.ult_cit}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
        <button onclick="window.location.href='/pacientes'">Volver</button>
      </body>
      </html>
    `;

    res.send(html);
  });
});
app.get('/ordenar-medicos',requireLogin,requireRole(['medico','administrador']),(req, res) => {
  const query = 'SELECT * FROM medicos ORDER BY especialidad ASC, apellido ASC, nombre ASC';

  db.query(query, (err, results) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'public', 'error.html'));
    }

    let html = `
      <html>
      <head>
        <link rel="stylesheet" href="/styles.css">
        <title>Medicos Ordenados</title>
      </head>
      <body>
        <h1>Medicos ordenados por nombre</h1>
        <table>
          <thead>
            <tr>
              <th>Id</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Especialidad</th>
            </tr>
          </thead>
          <tbody>
    `;

    results.forEach(medico => {
      html += `
        <tr>
          <td>${medico.id}</td>
          <td>${medico.nombre}</td>
          <td>${medico.apellido}</td>
          <td>${medico.especialidad}</td>
        </tr>
      `;
    });
    html += `
          </tbody>
        </table>
        <button onclick="window.location.href='/admed'">Volver</button>
      </body>
      </html>
    `;
    res.send(html);
  });
});
app.get('/medicos',requireLogin,requireRole(['medico','administrador']), (req, res) => {
  db.query('SELECT * FROM medicos', (err, results) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'public', 'error.html'));
    }

    let html = `
      <html>
      <head>
        <link rel="stylesheet" href="/styles.css">
        <title>Medicos</title>
      </head>
      <body>
        <h1>Medicos Registrados</h1>
        <table>
          <thead>
            <tr>
              <th>Id</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Especialidad</th>
            </tr>
          </thead>
          <tbody>
    `;

    results.forEach(medico => {
      html += `
        <tr>
          <td>${medico.id}</td>
          <td>${medico.nombre}</td>
          <td>${medico.apellido}</td>
          <td>${medico.especialidad}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
        <button onclick="window.location.href='/admed'">Volver</button>
      </body>
      </html>
    `;
    res.send(html);
  });
});
app.get('/cantidad-de-pacientes', requireLogin,requireRole(['medico','administrador']),(req, res) => {
  const query = 'SELECT count(id) AS cantidad_pacientes FROM pacientes;';

  db.query(query, (err, results) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'public', 'error.html'));
    }

    let html = `
      <html>
      <head>
        <link rel="stylesheet" href="/styles.css">
        <title>Cantidad de pacientes</title>
      </head>
      <body>
        <h1>Cantidad de Pacientes</h1>
        <table>
          <thead>
            <th>Pacientes Registrados</th>
          </thead>
          <tbody>
    `;
    results.every(paciente => {
      html += `
        <td>${paciente.cantidad_pacientes}</td>
      `;
    });

    html += `
      </tbody>
      <table> 
        <button onclick="window.location.href='/pacientes'">Volver</button>
      </body>
      </html>
    `;

    res.send(html);
  });
});
app.get('/edad-de-pacientes', requireLogin,requireRole(['medico','administrador']),(req, res) => {
  const query = 'SELECT AVG(edad) AS edad_promedio FROM pacientes;';

  db.query(query, (err, results) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'public', 'error.html'));
    }

    let html = `
      <html>
      <head>
        <link rel="stylesheet" href="/styles.css">
        <title>Edad Promedio</title>
      </head>
      <body>
        <h1>Edad Promedio de Pacientes</h1>
        <table>
          <thead>
            <tr>
              <th>Edad Promedio</th>
            </tr>
          </thead>
    `;
    results.every(paciente => {
      html += `
        <h1>
        <td>${paciente.edad_promedio}</td>
        </h1>
      `;
    });

    html += `
      <table> 
        <button onclick="window.location.href='/pacientes'">Volver</button>
      </body>
      </html>
    `;

    res.send(html);
  });
});
app.post('/docs', requireLogin, upload.single('archivo'), async (req, res) => {
  const { titulo, descripcion, ruta_archivo } = req.body;
  const archivo = req.file;

  if (!archivo) {
      return res.status(400).json({ error: 'Debe proporcionar un archivo' });
  }

  try {
      await db.query(
          'INSERT INTO archivos (titulo, descripcion, ruta_archivo) VALUES (?, ?, ?)',
          [titulo, descripcion, ruta_archivo]
      );

      res.status(201).json({ message: 'Manual subido exitosamente' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al subir el manual' });
  }
});
app.get('/index',requireLogin, (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/equipos',requireLogin, (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'equipos.html'));
});
app.get('/logan', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/admed',requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'regmed.html'));
});
app.get('/registrate', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'registro.html'));
});
app.get('/error',requireLogin, (req , res) => {
  res.sendFile(path.join(__dirname, 'public', 'error.html'));
});
app.get('/pacientes',requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pacientes.html'));
});
app.get('/busqueda',requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'busqueda.html'));
  });
app.get('/admin',requireLogin,requireRole('administrador'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  });
app.get('/logout',(req, res) => {
  req.session.destroy();
  res.redirect('/');
});
// Configuración de puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en funcionamiento en el puerto ${PORT}`));
