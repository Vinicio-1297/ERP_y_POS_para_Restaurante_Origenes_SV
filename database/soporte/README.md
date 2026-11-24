# Base de datos y ORM - Back B

Este módulo contiene las tablas, migraciones, datos iniciales
y modelos ORM correspondientes a usuarios, clientes y sucursales.

## Tecnologías utilizadas

- SQL Server
- Sequelize 6
- Tedious
- bcryptjs
- Node.js

## Instalación

Desde la carpeta backend, instalar las dependencias:

```bash
npm install
```

Configurar el archivo .env utilizando las variables de conexión
a SQL Server que ya utiliza el proyecto.

En una base de datos nueva, ejecutar en este orden:

```bash
npm run db:pos
npm run db:migrate
npm run db:seed
```

## Tablas agregadas

- sucursales: almacena las sucursales del restaurante.
- usuarios: almacena los usuarios y sus roles.
- clientes: almacena los clientes y sus datos fiscales.
- migraciones_soporte: registra las migraciones aplicadas.

## Relaciones

- Una sucursal puede tener muchos usuarios.
- Un usuario puede registrar muchos pedidos.
- Un usuario puede anular muchos pedidos.
- Un cliente puede estar asociado a muchos pedidos.

## ORM

Sequelize utiliza las mismas variables de entorno que la
conexión original del proyecto.

Los modelos se encuentran en backend/src/models:

- Sucursal.js
- Usuario.js
- Cliente.js
- index.js

La conexión original mediante mssql se mantiene para no
afectar el funcionamiento del POS.

## Migraciones

Para aplicar las migraciones pendientes:

```bash
npm run db:migrate
```

Las migraciones se ejecutan en orden y se registran en
la tabla migraciones_soporte.

Cada migración se ejecuta dentro de una transacción.

## Datos iniciales

Para insertar los datos de prueba:

```bash
npm run db:seed
```

Los seeds evitan insertar registros duplicados.

## Usuarios de prueba

| Correo | Contraseña | Rol |
|---|---|---|
| admin@origenes.sv | 123456 | administrador |
| gerente@origenes.sv | 123456 | gerente |
| cajero@origenes.sv | 123456 | cajero |

Las contraseñas se almacenan mediante hashes bcrypt
con un factor de coste de 12.

Estas cuentas son exclusivamente para desarrollo y pruebas.
No deben utilizarse en producción.

## Pruebas realizadas

- Conexión de Sequelize con SQL Server.
- Consulta de los tres modelos.
- Asociación entre usuarios y sucursales.
- Exclusión del hash en consultas habituales de usuarios.
- Validación de las tres contraseñas mediante bcrypt.
- Ejecución repetida de migraciones.
- Ejecución de seeds.
- 34 pruebas existentes del backend aprobadas.

## Consideraciones

No utilizar sequelize.sync con force o alter, ya que
la estructura de la base de datos se administra mediante
migraciones SQL.

No modificar migraciones que ya fueron aplicadas.
Los cambios estructurales posteriores deben agregarse
mediante nuevos archivos de migración.

No subir el archivo .env al repositorio.