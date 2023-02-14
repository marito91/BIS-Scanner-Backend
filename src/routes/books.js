const { Router } = require('express');
const books = Router();
// const { EntryModel } = require('../models/entryModel');
const { RecordModel } = require('../models/recordModel');
const { communityModel } = require('../models/communityModel');
const { BookModel } = require('../models/bookModel');
const nodemailer = require('nodemailer');

const mockData = [
  {
    title: 'The Adventures of Captain Underpants.',
    author: 'Dav Pilkey',
    year: '1997',
  },
  {
    title: 'Sisters',
    author: 'Raina Telgemeier',
    year: '2014',
  },
];

/**
 * X) Function date
 * Name : Get current date and time
 * METHOD : Local
 * This function lets the application set the current date and time each time that something is done. The function looks for the date and time and manages strings so that it returns the current date and time which will be then set for each process that requires it.
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
 * X) Function updateRecords
 * Name : Register new record
 * METHOD : Database connected
 * Params: Receives all info for later checking
 * Purpose: Registers a new entry everytime something is done in the application. Creates a history of processes.
 */
function updateRecords(existingUser, movement, bookInfo) {
  const newRecord = new RecordModel({
    document: existingUser.code,
    firstName: existingUser.firstName,
    lastName: existingUser.lastName,
    secondLastName: existingUser.secondLastName,
    grade: existingUser.grade,
    email: existingUser.email,
    device: 'none',
    number: 0,
    date: getDateTime()[0],
    time: getDateTime()[1],
    book: bookInfo,
    type: movement,
  });
  newRecord.save(function (error) {
    if (error) {
      console.log(error);
      console.log('Could not register a new record.');
    } else {
      console.log('New record registered.');
    }
  });
}

/**
 * X)
 * Name : Send Email
 * Method : Local Function
 * Route : None
 * Params : Array with a list of emails and a string with the message to be sent.
 * Description : This function is meant to be used each time a notification via email needs to be sent to any user. The function receives a list of emails and a message.
 */
function sendEmail(emailList, msg) {
  // Via the nodemailer package, a transporter is created.
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'mariogomez@britishschool.edu.co',
      pass: `${process.env.password}`,
    },
  });

  // All the information that goes in the email is written here.
  const mailOptions = {
    from: 'mariogomez@britishschool.edu.co',
    to: emailList,
    subject: 'Knowledge Centre Notification',
    text:
      msg +
      '\n\nMario Andres Gomez Vargas\nIntegrador de Tecnología\nBritish International School',
  };

  // The email is sent
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent'); // + info.response);
    }
  });
}

/**
 * 1)
 * Name : Rent books
 * Method : POST
 * Route : /rent
 * Description : This route will let the application receive the required information from frontend to be able to assign/rent a book to a certain user. The function receives a document number and a barcode. With this information it assigns the book to the user after checking all of the conditions required.
 */
books.post('/rent', async function (req, res) {
  // Document and barcode json come from frontend
  const { document, barcode } = req.body;

  // Then the code checks if both the user and book exist.
  const userExists = await communityModel.findOne({ code: parseInt(document) });
  const bookExists = await BookModel.findOne({
    barcode: barcode.toUpperCase(),
  });

  let status = '';
  let msg = '';

  if (!userExists) {
    status = 'Error';
    msg = 'User does not exist.';
  } else if (userExists.libraryFine) {
    status = 'Error';
    msg = 'User has a fine that needs to be paid.';
  } else if (
    userExists.books[0] !== 'none' ||
    userExists.books[0] !== ['none']
  ) {
    status = 'Error';
    msg = 'The user currently has a book rented.';
  } else if (!bookExists) {
    status = 'Error';
    msg = 'Book is not registered in the database.';
  } else if (!bookExists.available) {
    status = 'Error';
    msg = 'This book is currently rented.';
  } else {
    // HAY QUE ARREGLAR EL TEMA DE FECHA PARA QUE GUARDE LA FECHA EN LA QUE SE RENTA EL LIBRO Y SE GUARDA
    // SALE MEJOR PONER EL USUARIO QUE RENTA EN LA COLECCION DE BOOKS PARA SOLAMENTE USAR ESA BASE COMO FUENTE DE INFORMACION
    await BookModel.updateOne(
      { barcode: barcode.toUpperCase() },
      { $set: { available: false, dateRented: getDateTime()[0] } }
    );
    const bookToRent = await BookModel.findOne({
      barcode: barcode.toUpperCase(),
    });
    await communityModel.updateOne(
      { code: parseInt(document) },
      { $set: { books: [bookToRent] } }
    );
    updateRecords(userExists, 'RENT', bookExists);
    const message = `Dear user, \nYou have rented the book ${bookExists.title} today. Please remember to return it on time.\nThanks for using our service.\nRegards,`;
    sendEmail(userExists.email, message);
    status = 'Ok';
    msg = 'Book rented successfully.';
  }
  res.send({ status, msg });
});

/**
 * 2)
 * Name : Return books
 * Method : POST
 * Route : /return
 */
books.post('/return', async function (req, res) {
  const { barcode } = req.body;

  const bookExists = await BookModel.findOne({
    barcode: barcode.toUpperCase(),
  });

  const userHasBook = await communityModel.findOne({
    books: { $elemMatch: { barcode: bookExists.barcode } },
  });

  if (!userHasBook && bookExists) {
    res.send({
      status: 'Error',
      msg: `This book does not appear as rented in our database.`,
    });
  } else {
    await communityModel.updateOne(
      { code: userHasBook.code },
      {
        $set: {
          books: ['none'],
        },
      }
    );
    await BookModel.updateOne(
      { barcode: barcode.toUpperCase() },
      { $set: { available: true, dateRented: '' } }
    );

    updateRecords(userHasBook, 'RETURN', bookExists);
    const message = `Dear user, \nYou returned the book ${bookExists.title} today. \nThanks for using our service.\nRegards,`;
    sendEmail(userHasBook.email, message);
    res.send({
      status: 'Ok',
      msg: `The book ${bookExists.title} was returned by ${userHasBook.firstName} ${userHasBook.lastName} successfully.`,
    });
  }
});

/**
 * 3)
 * Name : Get book rented history
 * Method : GET
 * Route : /rented
 * Description : This route lets the frontend application display how many devices have been rented so far.
 */
books.get('/rented', function (req, res) {
  // An object is initialized.
  let data = {};

  // Inside the records
  communityModel.find(
    {
      books: { $ne: ['none'] },
    },
    function (error, usersThatHaveBooks) {
      if (error) {
        res.send({
          status: 'Error',
          msg: 'A connection to database could not be established.',
        });
      } else {
        data = usersThatHaveBooks;
        // console.log(usersThatHaveBooks);
        res.send({ status: 'ok', msg: 'Info found', data });
      }
    }
  );
});

/**
 * 4)
 * Name : Get book collection
 * Method : GET
 * Route : /search
 * Description : This route sends all of the book data to frontend so that users can search for any book they want.
 */
books.get('/search', async (req, res) => {
  // An object is initialized.
  let books = {};

  // Inside the records
  BookModel.find({}, function (error, allBooks) {
    if (error) {
      res.send({
        status: 'Error',
        msg: 'A connection to database could not be established.',
      });
    } else {
      books = allBooks;
      // console.log(usersThatHaveBooks);
      res.send({ status: 'ok', msg: 'Info found', books });
    }
  });
});

/**
 * 5)
 * Name : Get book requested
 * Method : GET
 * Route : /getBook
 * Description : This route sends all of the book data to frontend so that users can search for any book they want.
 */
books.post('/getBook', async (req, res) => {
  // The barcode requested comes from client side.
  const { barcode } = req.body;
  const requestedBarcode = barcode.toUpperCase();
  console.log(requestedBarcode);

  // The book is searched in the data base.
  const bookExists = await BookModel.findOne({ barcode: requestedBarcode });
  console.log(bookExists);
  if (!bookExists) {
    res.send({
      status: 'Error',
      msg: `There is no entry for the barcode ${barcode} registered in our database.`,
    });
  } else {
    res.send({ status: 'ok', msg: 'Book was found.', bookExists });
  }
});

/**
 * 6)
 * Name : Create a new bok
 * Method : POST
 * Route : /newBook
 * Description : This route receives all of the new book's information from client side and creates a new entry in the collection.
 */
books.post('/new-book', async (req, res) => {
  // The book to be added to database comes from client side as an object.
  const { book } = req.body;

  //
  const bookExists = await BookModel.findOne({
    barcode: book.barcode.toUpperCase(),
  });

  if (bookExists) {
    res.send({
      status: 'Error',
      msg: `The barcode ${bookExists.barcode} is already registered in our database for the book ${bookExists.title}`,
    });
  } else {
    const newBook = new BookModel({
      title: book.title,
      author: book.author,
      barcode: book.barcode,
      publicationYear: book.publicationYear,
      isbn: book.isbn,
      price: book.price,
      materialType: book.materialType,
      sublocation: book.sublocation,
      vendor: book.vendor,
      circulationType: book.circulationType,
      dewey: book.dewey,
      condition: 'New',
      dateRented: 'none',
      available: true,
    });
    newBook.save(function (error) {
      if (error) {
        console.log(error);
        return res.send({
          status: 'error',
          msg: "Couldn't register new book in the database",
        });
      }
      res.send({
        status: 'ok',
        msg: `The book ${book.title} was registered in our database successfully!`,
      });
    });
  }

  // The book is searched in the data base.
  // const bookExists = await BookModel.find({ barcode: requestedBarcode });

  // if (!bookExists) {
  //   res.send({
  //     status: 'Error',
  //     msg: `There is no entry for the barcode ${barcode} registered in our database.`,
  //   });
  // } else {
  //   res.send({ status: 'ok', msg: 'Book was found.', bookExists });
  // }
});

/** Routes to create
 * Insert new book
 * Update books
 * Search books
 * Delete books
 */

exports.books = books;
