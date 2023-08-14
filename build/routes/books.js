"use strict";

const {
  Router
} = require('express');
const books = Router();
const {
  UserModel
} = require('../models/userModel');
const {
  BookModel
} = require('../models/bookModel');
const nodemailer = require('nodemailer');

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
      user: 'kc@britishschool.edu.co',
      pass: `${process.env.password}`
    }
  });

  // All the information that goes in the email is written here.
  const mailOptions = {
    from: 'kc@britishschool.edu.co',
    to: emailList,
    subject: 'Knowledge Centre Notification',
    text: msg + '\n\nKC Services\nKnowledge Centre\nBritish International School'
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
 * X) Function date
 * Name : Get current date and time
 * METHOD : Local
 * This function lets the application set the current date and time each time that something is done. The function looks for the date and time and manages strings so that it returns the current date and time which will be then set for each process that requires it.
 */

function getDateAndTime() {
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
 * 1)
 * Name : Rent books
 * Method : POST
 * Route : /rent
 * Description : This route will let the application receive the required information from frontend to be able to assign/rent a book to a certain user. The function receives a document number and a barcode. With this information it assigns the book to the user after checking all of the conditions required.
 */
books.post('/rent', async function (req, res) {
  // Document and barcode json come from frontend
  const {
    document,
    barcode,
    dueDate
  } = req.body;
  if (!document || !barcode || !dueDate) {
    res.send({
      status: 'Error',
      msg: 'Invalid user input. Please check all the fields and try again.'
    });
    return;
  }

  // Se separan los datos según el formato que trae la fecha XX-XX-XXXX
  const dateArr = dueDate.split('-');
  // Se revisa que la separación se haya realizado correctamente
  console.log(dateArr);
  // Se crea una nueva string con el formato utilizado para las fechas.
  const fixedDate = dateArr[1] + '/' + dateArr[2] + '/' + dateArr[0];
  console.log(fixedDate);
  // Then the code checks if both the user and book exist.
  const userExists = await UserModel.findOne({
    document: Number(document)
  });
  const bookExists = await BookModel.findOne({
    barcode: barcode.toUpperCase()
  });
  let status = '';
  let msg = '';
  if (!userExists) {
    status = 'Error';
    msg = 'User does not exist.';
  } else if (userExists.blocked) {
    status = 'Error';
    msg = 'User has a fine that needs to be paid.';
  } else if (userExists.hasBookRented) {
    status = 'Error';
    msg = 'The user currently has a book rented.';
  } else if (!bookExists) {
    status = 'Error';
    msg = 'Book is not registered in the database.';
  } else if (!bookExists.available) {
    status = 'Error';
    msg = 'This book is currently rented.';
  } else {
    await BookModel.updateOne({
      barcode
    }, {
      $set: {
        userDocument: Number(userExists.document),
        available: false,
        dateRented: getDateAndTime()[0] + ' ' + getDateAndTime()[1]
      },
      $push: {
        rentalHistory: {
          userDocument: Number(userExists.document),
          dueDate: fixedDate,
          dateRented: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
          dateReturned: null,
          conditions: null
        }
      }
    });
    // Update user rental history
    await UserModel.updateOne({
      document: Number(document)
    }, {
      $set: {
        hasBookRented: true
      },
      $push: {
        bookHistory: {
          barcode,
          dueDate: fixedDate,
          dateRented: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
          dateReturned: null,
          conditions: null
        }
      }
    });
    // A message is stated to be sent to the client
    const message = `Dear user, \nYou have rented the book ${bookExists.title} today. Please remember to return it by ${dueDate}.\nThanks for using our service.\nRegards,`;
    sendEmail(userExists.email, message);
    status = 'OK';
    msg = 'Book rented successfully.';
  }
  res.send({
    status,
    msg
  });
});

/**
 * 2)
 * Name : Return books
 * Method : POST
 * Route : /return
 */
books.post('/return', async function (req, res) {
  const {
    barcode
  } = req.body;

  // First we check if the barcode came from client side. If it didn't we send the msg to front and close the function.
  if (!barcode) {
    // console.log('There is no barcode');
    res.send({
      status: 'Error',
      msg: 'Please enter a valid barcode'
    });
    return;
  }

  // We have to check if the books exists in database first and it is indeed rented.
  const bookExists = await BookModel.findOne({
    barcode: barcode.toUpperCase(),
    available: false
  });
  const userThatHasBook = await UserModel.findOne({
    document: bookExists.userDocument
  });
  if (!bookExists) {
    res.send({
      status: 'Error',
      msg: `We couldn't locate the book ${barcode} in the database.`
    });
  } else {
    await UserModel.updateOne({
      document: bookExists.userDocument
    }, {
      $set: {
        hasBookRented: false
      },
      $push: {
        bookHistory: {
          barcode,
          dateRented: null,
          dateReturned: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
          conditions: null
        }
      }
    });
    await BookModel.updateOne({
      barcode: barcode.toUpperCase(),
      available: false
    }, {
      $set: {
        userDocument: 0,
        available: true
      },
      $push: {
        rentalHistory: {
          userDocument: bookExists.userDocument,
          dateRented: null,
          dateReturned: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
          duetDate: bookExists.rentalHistory[bookExists.rentalHistory.length - 1],
          conditions: 'none'
        }
      }
    });

    // A message declaration is stated to be sent via email to the user that returned the book.
    const message = `Dear user, \nYou returned the book ${bookExists.title} today. \nThanks for using our service.\nRegards,`;
    // The email is sent.
    sendEmail(userThatHasBook.email, message);
    // A message is sent to client side to determine that everything went ok.
    res.send({
      status: 'Ok',
      msg: `The book ${bookExists.title} was returned by ${userThatHasBook.name} ${userThatHasBook.lastName} successfully.`
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
books.get('/rented', async function (req, res) {
  // An object is initialized.
  let data = [];

  // Inside the records
  const rentedBooks = await BookModel.find({
    available: false
  });
  const activeUsers = await UserModel.find({
    hasBookRented: true
  });
  if (!rentedBooks) {
    res.send({
      status: 'Error',
      msg: 'Rented book could not be fetched from the DataBase.'
    });
  } else {
    const listOfRentedBooks = await activeUsers.map(user => {
      const book = rentedBooks.find(book => book.userDocument === user.document);
      if (book) {
        // console.log(book.title);
        return {
          ...user._doc,
          // copy all properties of the user object
          title: book.title,
          author: book.author,
          conditions: book.conditions,
          // We take the last element of the rentalhistory array and grab the dateRented by converting it to isoString and taking only the date.
          dateRented: book.rentalHistory[book.rentalHistory.length - 1].dateRented
          // .toISOString()
          // .substring(0, 10)
          // .split('-')
          // .reverse()
          // .join('/'),
          // time: book.rentalHistory[book.rentalHistory.length - 1].dateRented
          //   .toISOString()
          //   .substring(11, 19),
        };
      }

      return user;
    });
    // console.log(listOfRentedBooks);
    data = listOfRentedBooks;
    // console.log(data);
    res.send({
      status: 'OK',
      msg: 'Rented books fetched succesfully',
      data
    });
  }
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
        msg: 'A connection to database could not be established.'
      });
    } else {
      books = allBooks;
      // console.log(usersThatHaveBooks);
      res.send({
        status: 'ok',
        msg: 'Info found',
        books
      });
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
  const {
    barcode
  } = req.body;
  const requestedBarcode = barcode.toUpperCase();
  // console.log(requestedBarcode);

  // The book is searched in the data base.
  const bookExists = await BookModel.findOne({
    barcode: requestedBarcode
  });
  // console.log(bookExists);
  if (!bookExists) {
    res.send({
      status: 'Error',
      msg: `There is no entry for the barcode ${barcode} registered in our database.`
    });
  } else {
    res.send({
      status: 'ok',
      msg: 'Book was found.',
      bookExists
    });
  }
});

/**
 * 6)
 * Name : Create a new book
 * Method : POST
 * Route : /newBook
 * Description : This route receives all of the new book's information from client side and creates a new entry in the collection.
 */
books.post('/new-book', async (req, res) => {
  // The book to be added to database comes from client side as an object.
  const {
    book
  } = req.body;
  if (book.title === undefined || book.author === undefined || book.barcode === undefined || book.publicationYear === undefined || book.isbn === undefined || book.price === undefined || book.materialType === undefined || book.sublocation === undefined || book.vendor === undefined || book.circulationType === undefined || book.conditions === undefined || book.title === '' || book.author === '' || book.barcode === '' || book.publicationYear === '' || book.isbn === '' || book.price === '' || book.materialType === '' || book.sublocation === '' || book.vendor === '' || book.circulationType === '' || book.conditions === '') {
    res.send({
      status: 'Error',
      msg: 'Please make sure all fields are registered.'
    });
  } else {
    //
    const bookExists = await BookModel.findOne({
      barcode: book.barcode.toUpperCase()
    });
    if (bookExists) {
      res.send({
        status: 'Error',
        msg: `The barcode ${bookExists.barcode} is already registered in our database for the book ${bookExists.title}`
      });
    } else {
      const newBook = new BookModel({
        userDocument: 0,
        title: book.title,
        author: book.author,
        barcode: book.barcode.toUpperCase(),
        publicationYear: book.publicationYear,
        isbn: book.isbn,
        price: book.price,
        materialType: book.materialType,
        sublocation: book.sublocation,
        vendor: book.vendor,
        circulationType: book.circulationType,
        dewey: book.dewey,
        conditions: book.conditions,
        dateRented: null,
        dateReturned: null,
        available: true,
        rentalHistory: null
      });
      newBook.save(function (error) {
        if (error) {
          console.log(error);
          return res.send({
            status: 'error',
            msg: "Couldn't register new book in the database"
          });
        }
        res.send({
          status: 'ok',
          msg: `The book ${book.title} was registered in our database successfully!`
        });
      });
    }
  }
});

/**
 * 7)
 * Name : Update existing Book
 * Method : POST
 * Route : /update
 * Description : This route receives all of the new book's information from client side and creates a new entry in the collection.
 */
books.post('/update', async (req, res) => {
  // The book to be added to database comes from client side as an object.
  const {
    book
  } = req.body;

  //
  const bookExists = await BookModel.findOne({
    barcode: book.barcode.toUpperCase()
  });

  // console.log(bookExists);

  if (!bookExists) {
    res.send({
      status: 'Error',
      msg: `The requested book does not appear in our database. If you believe this is a mistake, please contact ICT Support.`
    });
  } else {
    // console.log(book);
    await BookModel.updateOne({
      barcode: book.barcode.toUpperCase()
    }, {
      $set: {
        title: book.title,
        author: book.author,
        barcode: book.barcode,
        publicationYear: book.publicationYear,
        isbn: book.isbn,
        price: book.price,
        conditions: book.conditions,
        materialType: book.materialType,
        sublocation: book.sublocation,
        vendor: book.vendor,
        circulationType: book.circulationType,
        dewey: book.dewey,
        available: true
      }
    });
    console.log('Book was updated');
    res.send({
      status: 'ok',
      msg: 'Book was updated successfully. Please load the book again to check!'
    });
  }
});

/**
 * 8)
 * Name : Delete book from database
 * Method : POST
 * Route : /delete
 * Description : This route will eliminate the book from the database. The client sends a barcode and after many confirmations, decides to delete this book.
 */
books.post('/delete', async (req, res) => {
  // The book to be added to database comes from client side as an object.
  const {
    barcode
  } = req.body;
  const bookToDeleteBarcode = barcode;

  //
  const bookExists = await BookModel.findOne({
    barcode: bookToDeleteBarcode.toUpperCase()
  });

  // console.log(bookExists);

  if (!bookExists) {
    res.send({
      status: 'Error',
      msg: `The requested book does not appear in our database. If you believe this is a mistake, please contact ICT Support.`
    });
  } else {
    await BookModel.deleteOne({
      barcode: bookExists.barcode
    });
    console.log('Book was deleted');
    res.send({
      status: 'ok',
      msg: 'Book was deleted successfully. So sad to hear that book has gone away 😢'
    });
  }
});

/**
 * 9)
 * Name : Send notifications to one user
 * Method : POST
 * Route : /notification
 * Description : The purpose of this route is to send an email notification to a specific person, that the user decides via frontend.
 */
books.post('/notification', function (req, res) {
  // The recipient´s information is received via an object that comes from frontend.
  const {
    user
  } = req.body;

  // We extract the email from the object.
  const email = user.email;

  // console.log(user.title);

  // The text that is going to be sent, is written in prior hand.
  const mailText = `Dear ${user.name},\nYou have the book ${user.title} from the library currently rented. Please return it to the Knowledge Centre by the end of day.\nThank you very much!`;

  // We use the sendEmail function adding the email as first param and the text as the second param. A message indicating that everything worked is sent to Frontend.
  sendEmail(email, mailText);
  res.send({
    status: 'ok',
    msg: 'The user was notified by email.'
  });
});

/** Routes to create
 * Insert new book
 * Update books
 * Search books
 * Delete books
 */

exports.books = books;
//# sourceMappingURL=books.js.map