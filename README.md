# Base-De-Datos-
Este proyecto se realizo como entrega final de la materia base de datos, aqui se subieron los codigos utilizados para que funcione el proyecto, solo se haran unas espesificaciones para que el proyecto pueda funcionar con cualquier persona.

# .env
aqui tenemos que cambiar los valores por el nombre de la base de datos que se esta utilizando, este caso es "biomedica", al igual que cambiar el nombre de usuario y su contraseña por la que se tiene asignada en su MySQL.

# Dependencias

Tenemos la excepción de esta libreria la cual de recomendacion siempre se debe instalar primero que cualquier otra 
npm init -y = Se utiliza para inicializar un proyecto Node.js creando automáticamente un archivo package.json con valores predeterminados. 

para que funcione el proyecto se tienen que instalar las dependencias desde la terminal, utilizando el comando:
                                                       
                                                       -npm Install -
se usara ese comando junto a cada dependencia que se tiene, las cuales en este proyecto son:

express = es una herramienta esencial para desarrollar servidores web y APIs rápidas y flexibles con Node.js.

mysql2 = es una herramienta esencial para interactuar de manera eficiente y segura con bases de datos MySQL/MariaDB en proyectos Node.js.

body-parser = Es un middleware que facilita el acceso a los datos enviados por el cliente en una solicitud HTTP y el manejo de formatos como JSON y formularios.

express-session = es una herramienta clave para manejar sesiones de usuario en aplicaciones web, proporcionando una forma eficiente de guardar y recuperar datos específicos de cada usuario.

bcrypt = es una herramienta esencial para proteger contraseñas en aplicaciones modernas, añadiendo una capa de seguridad crítica para evitar que contraseñas comprometidas sean fácilmente descifradas.

dotenv = es una herramienta para utilizar las variables del entorno.

multer = es esencial para manejar la carga de archivos en aplicaciones Node.js, proporcionando control total sobre el almacenamiento y procesamiento de los mismos, mientras simplifica el -manejo de formularios.

xlsx = es una biblioteca de Node.js que se utiliza para trabajar con archivos de Excel.

nodemon = es una herramienta de desarrollo para aplicaciones Node.js que ayuda a automáticamente reiniciar el servidor cada vez que se realiza un cambio en el código fuente.

Tambien se pueden instalar cuntas combinando el comando de instalacion seguida de todas las dependencias de la siguiente forma

npm install express mysql2 body-parser express-session bcrypt dotenv multer xlsx nodemon 

En mi experiencia tube alunos probmeas con algunas librerias que no se instalaban correctamente por lo que si recomiendo que se instalen individualmente cada una para asegurar su correcto funconamiento.
