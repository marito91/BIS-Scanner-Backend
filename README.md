# Aplicación Knowledge Centre Device Manager Backend

Este codigo tiene como objetivo administrar el servidor backend para el alquiler y devolución de dispositivos en el British International School. La persona que maneje este codigo tendrá la potestad de administrar las rutas y modelos para el uso de la información que se trae tanto de frontend como de la base de datos.

## Rutas Disponibles

Esta aplicación permite hacer los siguientes procesos:

### Alquiler

Recibe información de frontend y envía la información a la base de datos después de hacer las respectivas validaciones. Esta información incluye todos los datos pertinentes del usuario, tales como nombres, apellidos, dipositivo/número que recibe, y crea fecha y hora en la que se genera el movimiento.

### Devolución

Recibe dispositivo y su respectivo número para validar en base de datos y registrar la devolución, o desactivar su uso en base de datos.

### Creación de Registros

Cada vez que esta aplicación registra un alquier o una devolución, también crea un registro de movimiento en base de datos con el fin de poder mantener un historial de todos los movimientos que se realizan en la aplicación.

## Otras especificaciones

## MONGO SERVER

La base de datos es privada por ende no se puede compartir en esta aplicación.
# BIS-Scanner-WebApp-Backend-
# BIS-Scanner-WebApp-Backend
# BIS-Scanner-WebApp-Backend
# BIS-Scanner-WebApp-Backend
# BIS-Scanner-WebApp-Backend
