const { Router } = require('express');
const users = Router();
const { entryModel } = require('../models/entryModel');
const { communityModel } = require('../models/communityModel');
const nodemailer = require('nodemailer');

/**
 * X) Function date
 * Name : Get current date and time
 * METHOD : Local
 */

function getDateTime() {
  let today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
  const yyyy = today.getFullYear();
  const h = String(today.getHours());
  const m = String(today.getMinutes()).padStart(2, '0');

  today = mm + '/' + dd + '/' + yyyy;
  // Saca hora actual
  const time = h + ':' + m;

  return [today, time];
}
/**
 * X) Function Overwrite
 * Name : Overwrite rented device
 * METHOD : Database connected
 * Params: Receives student document, device type, device number and current date
 * Purpose: Update a user by assigning the device brought from Front end and changing the active state to true.
 */

function overwrite(stu, dev, num, dat, tim) {
  // Busca al estudiante que se va a actualizar por su documento (code : student)
  communityModel.updateOne(
    { code: stu },
    // Hace los respectivos cambios en el registro encontrado
    { $set: { device: dev, number: num, date: dat, time: tim, active: true } },
    function (error) {
      // Si hay un error envía mensaje que indica que no se pudo registrar el cambio.
      if (error) {
        res.send({
          estado: 'error',
          msg: 'No se pudo registrar el aquiler por problemas en la actualización del usuario.',
        });
      }
    }
  );
}

/**
 * X) Function returnDevice
 * Name : Return rented device
 * METHOD : Database connected
 * Params: Receives device type, device number and current date
 * Purpose: Update a user by assigning the device brought from Front end and changing the active state to true.
 */

function returnDevice(dev, num, dat, tim) {
  // Busca al usuario que se va a actualizar según el dispositivo y número (device: dev, number: num)
  communityModel.updateOne(
    { device: dev, number: num },
    // Hace los respectivos cambios en el registro encontrado
    {
      $set: { device: 'none', number: 0, date: dat, time: tim, active: false },
    },
    function (error) {
      // Si hay un error envía mensaje que indica que no se pudo registrar el cambio.
      if (error) {
        res.send({
          estado: 'error',
          msg: 'No se pudo registrar la devolución del equipo por problemas en la actualización del usuario.',
        });
      }
    }
  );
}

/**
 * X) Function registerEntry
 * Name : Register entry
 * METHOD : Database connected
 * Params: Receives all info for later checking
 * Purpose: Registers a new entry everytime something is done in the application. Creates a history of processes.
 */

function registerEntry(
  stu,
  name,
  last,
  secondLast,
  sec,
  mail,
  dev,
  num,
  dat,
  tim,
  typ
) {
  const newEntry = new entryModel({
    code: stu,
    firstName: name,
    lastName: last,
    secondLastName: secondLast,
    grade: sec,
    email: mail,
    device: dev,
    number: num,
    date: dat,
    time: tim,
    type: typ,
  });
  newEntry.save(function (error) {
    if (error) {
      console.log(error);
      console.log('No se pudo crear un nuevo registro de movimiento.');
    }
    console.log('Registro exitoso.');
  });
}

/**
 * X)
 * Name : Probar conexión
 * Method : POST
 * Route : /prueba
 */
users.post('/prueba', async function (req, res) {
  // Se recibe la información del frontend
  const { mensaje } = req.body;
  mensaje.txt === 'Mensaje de prueba'
    ? res.send({
        status: 'ok',
        msg: 'La aplicación se encuentra conectada al servidor.',
      })
    : res.send({
        status: 'Error',
        msg: 'La aplicación no pudo establecer una conexión estable al servidor. Por favor contacte a soporte.',
      });
});

/**
 * X)
 * Name : Enviar email
 * Method :
 * Route :
 */
function sendEmail(emailList, msg) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'mariogomez@britishschool.edu.co',
      pass: `${process.env.password}`,
    },
  });

  const mailOptions = {
    from: 'mariogomez@britishschool.edu.co',
    to: emailList,
    subject: 'Knowledge Centre Notification',
    text: msg,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

/**
 * 1)
 * Name : Rent devices
 * Method : POST
 * Route : /rent
 */
users.post('/rent', async function (req, res) {
  // Se recibe la información del frontend
  const { user } = req.body;
  console.log(typeof user.document);

  // El objeto se desestructura en diferentes variables
  const [student, device, number, entryDate, entryTime] = [
    parseInt(user.document),
    user.device,
    user.number,
    getDateTime()[0],
    getDateTime()[1],
  ];
  // Se hace validación en consola para revisar si los datos llegaron correctamente.
  console.log('Member code: ' + student);
  console.log('Device: ' + device);
  console.log('Number: ' + number);
  console.log('Entry Date: ' + entryDate);
  console.log('Entry Time: ' + entryTime);

  // Se busca primero si el usuario existe en base de datos por medio del número de documento.
  const exists = await communityModel.findOne({ code: parseInt(student) });
  // Si el estudiante no existe, envía un mensaje indicando que el usuario no se encuentra registrado en la base de datos.
  if (!exists) {
    res.send({
      status: 'error',
      msg: `El usuario ${user.document} no se encuentra registrado en nuestra base de datos.`,
    });
    // Si por lo contrario, el usuario sí existe, se revisa que no tenga un dispositivo alquilado ya.
  } else {
    // Si tiene un dispositivo alquilado, se envía el mensaje respectivo al frontend indicando cuál es el dispositivo que debe entregar.
    if (exists.active) {
      res.send({
        status: 'Error',
        msg: `El estudiante ${exists.firstName} ${exists.lastName} con documento ${exists.code} tiene actualmente el dispositivo ${exists.device} #${exists.number} alquilado. Fue alquilado el ${exists.date} a las ${exists.time} y no ha sido devuelto.`,
      });
    } else {
      // De lo contrario ya pasó todas las validaciones y se procede a editar el registro y asignarle el dispositivo al estudiante por medio de la función de overwrite.
      overwrite(
        parseInt(student),
        device,
        parseInt(number),
        entryDate,
        entryTime
      );
      // Se realiza movimiento por ende se registra en base de datos.
      registerEntry(
        exists.code,
        exists.firstName,
        exists.lastName,
        exists.secondLastName,
        exists.grade,
        exists.email,
        device,
        parseInt(number),
        entryDate,
        entryTime,
        'ALQUILER'
      );
      const message = `Estimado/a usuario,\nUsted ha alquilado el ${device} #${number} en el Knowledge Centre el día de hoy. Recuerde devolverlo al finalizar la jornada escolar.\nMuchas gracias por usar nuestro servicio.\nAtentamente,`;
      sendEmail(exists.email, message);
      res.send({ estado: 'ok', msg: 'Alquiler registrado con éxito.' });
    }
  }
});

/**
 * 2)
 * Name : Return devices
 * Method : POST
 * Route : /return
 */
users.post('/return', async function (req, res) {
  // Se recibe la información del frontend
  const { device, number } = req.body;
  // El objeto se desestructura en diferentes variables
  const [type, num, entryDate, entryTime] = [
    device,
    Number(number),
    getDateTime()[0],
    getDateTime()[1],
  ];
  // Se hace validación en consola para revisar si los datos llegaron correctamente.
  console.log('Device: ' + type);
  console.log('Number: ' + num);
  console.log('Entry Date: ' + entryDate);
  console.log('Entry Time: ' + entryTime);

  // Se busca primero el registro que corresponda al tipo de dispositivo y número que se solicita desde frontend.
  const exists = await communityModel.findOne({
    device: type,
    number: parseInt(num),
  });
  // Si el registro no existe, envía un mensaje indicando que no se encontró un registro de ese dispositivo en base de datos.
  if (!exists) {
    res.send({
      status: 'error',
      msg: `No se encontró en base de datos un registro que corresponda al ${type} #${num}`,
    });
    // Si por lo contrario, se encuentra un registro entonces se pasa a realizar el proceso de devolución.
  } else {
    returnDevice(type, parseInt(num), entryDate, entryTime);
    //  Debido a que se realiza un movimiento, este se registra en base de datos.
    registerEntry(
      exists.code,
      exists.firstName,
      exists.lastName,
      exists.secondLastName,
      exists.grade,
      exists.email,
      type,
      parseInt(num),
      entryDate,
      entryTime,
      'DEVOLUCION'
    );
    const message = `Estimado/a usuario,\nUsted ha devuelto el ${type} #${num} al Knowledge Centre exitosamente. Gracias por utilizar nuestro servicio.`;
    sendEmail(exists.email, message);
    res.send({
      estado: 'ok',
      msg: `El ${exists.device} #${exists.number} alquilado por ${exists.firstName} ${exists.lastName} fue devuelto exitosamente.`,
    });
  }
});

/**
 * 3)
 * Name : Search devices
 * Method : POST
 * Route : /search
 */
users.post('/search', async function (req, res) {
  // Se recibe la información del frontend
  const { searchInfo } = req.body;
  // El objeto se desestructura en diferentes variables
  const [type, num] = [searchInfo.device, searchInfo.number];
  // Se hace validación en consola para revisar si los datos llegaron correctamente.
  console.log('Device: ' + type);
  console.log('Number: ' + num);

  // Se busca primero el registro que corresponda al tipo de dispositivo y número que se solicita desde frontend.
  const exists = await communityModel.findOne({
    device: type,
    number: parseInt(num),
  });
  // Si el registro no existe, envía un mensaje indicando que no se encontró un registro de ese dispositivo en base de datos.
  if (!exists) {
    res.send({
      status: 'error',
      msg: `El ${type} #${num} no se encuentra alquilado en este momento.`,
    });
    // Si por lo contrario, se encuentra un registro entonces se indica quién lo tiene y desde cuándo.
  } else {
    res.send({
      estado: 'ok',
      msg: `El ${exists.device} #${exists.number} se encuentra alquilado por ${exists.firstName} ${exists.lastName} ${exists.secondLastName} de ${exists.grade} desde el ${exists.date} a las ${exists.time}.`,
    });
  }
});

/**
 * 4)
 * Name : Get User Entries
 * Method : POST
 * Route : /entries
 */
users.post('/entries', async function (req, res) {
  // Se recibe la información del frontend
  const { searchInfo } = req.body;
  const [doc, dat, filt] = [
    parseInt(searchInfo.document),
    searchInfo.date,
    searchInfo.filter,
  ];
  console.log(dat);
  const dateArr = dat.split('-');
  console.log(dateArr);
  const fixedDate = dateArr[1] + '/' + dateArr[2] + '/' + dateArr[0];
  console.log(fixedDate);

  let data = {};

  filt === 'Documento'
    ? (data = await entryModel.find({ code: doc }))
    : (data = await entryModel.find({ date: fixedDate }));

  res.send({ status: 'ok', msg: 'Info found', data });
});

/**
 * 5)
 * Name : Get Device Entries
 * Method : GET
 * Route : /devices
 */
users.get('/devices', function (req, res) {
  // Se inicializa el objeto que se va a enviar
  let data = {};

  // Se buscan todos los registros que tengan un dispositivo rentado.
  communityModel.find({ active: true }, function (error, activeOnes) {
    if (error) {
      res.send({
        status: 'Error',
        msg: 'No se pudo establecer una conexión a base de datos.',
      });
    } else {
      data = activeOnes;
      res.send({ status: 'ok', msg: 'Info found', data });
    }
  });
});

/**
 * 6)
 * Name : Send notifications to one user
 * Method : POST
 * Route : /notification
 */
users.post('/notification', function (req, res) {
  // Se inicializa el objeto que se recibe (disposititvos rentados)
  const { user } = req.body;
  console.log(user);

  // Se crea un array de emails solamente para enviarles la notificacion
  const email = user.email;

  const mailText = `Estimado/a ${user.name},\nUsted tiene alquilado en este momento un dispositivo de biblioteca. Por favor regresarlo a más tardar el día de hoy al Knowledge Centre.\nMuchas gracias`;

  // Se aplica la funcion de sendEmail con el array de correos creado recientemente
  sendEmail(email, mailText);
  res.send({
    status: 'ok',
    msg: 'El usuario fue notificado por correo.',
  });
});

/**
 * 7)
 * Name : Send notifications to all users
 * Method : POST
 * Route : /notification
 */
users.post('/notification_all', function (req, res) {
  // Se inicializa el objeto que se recibe (disposititvos rentados)
  const { rented } = req.body;
  console.log(rented);

  // Se crea un array de emails solamente para enviarles la notificacion
  const emails = rented.map((user) => user.email);

  const mailText =
    'Estimado/a usuario,\nUsted tiene alquilado en este momento un dispositivo de biblioteca. Por favor regresarlo inmediatamente al Knowledge Centre.';
  // Se aplica la funcion de sendEmail con el array de correos creado recientemente
  sendEmail(emails, mailText);
  res.send({
    status: 'ok',
    msg: 'Las notificaciones fueron enviadas por correo a los usuarios.',
  });
});

exports.users = users;
