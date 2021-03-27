var BookInstance = require('../models/bookinstance');
const { body, validationResult } = require('express-validator');
var Book = require('../models/book');
const bookinstance = require('../models/bookinstance');
const async = require('async');
const { RequestHeaderFieldsTooLarge } = require('http-errors');
const { Settings } = require('luxon');
Settings.defaultZoneName = 'utc';

exports.bookinstance_list = function (req, res, next) {
  BookInstance.find()
    .populate('book')
    .exec(function (err, list_bookinstances) {
      if (err) {
        return next(err);
      }
      res.render('bookinstance_list', {
        title: 'Book Instance List',
        bookinstance_list: list_bookinstances,
      });
    });
};

exports.bookinstance_detail = function (req, res, next) {
  BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookinstance) {
      if (err) {
        return next(err);
      }
      if (bookinstance == null) {
        var err = new Error('Book copy not found');
        err.status = 404;
        return next(err);
      }
      res.render('bookinstance_detail', {
        title: 'Copy: ' + bookinstance.book.title,
        bookinstance: bookinstance,
      });
    });
};

exports.bookinstance_create_get = function (req, res, next) {
  Book.find({}, 'title').exec(function (err, books) {
    if (err) {
      return next(err);
    }
    res.render('bookinstance_form', {
      title: 'Create BookInstance',
      book_list: books,
    });
  });
};

exports.bookinstance_create_post = [
  body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
  body('imprint', 'Imprint must be specified')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('status').escape(),
  body('due_back', 'Invalid date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),
  (req, res, next) => {
    const errors = validationResult(req);
    var bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });
    if (!errors.isEmpty()) {
      Book.find({}, 'title').exec(function (err, books) {
        if (err) {
          return next(err);
        }
        res.render('bookinstance_form', {
          title: 'Create BookInstance',
          book_list: books,
          selected_book: bookinstance.book._id,
          errors: errors.array(),
          bookinstance: bookinstance,
        });
      });
      return;
    } else {
      bookinstance.save(function (err) {
        if (err) {
          return next(err);
        }
        res.redirect(bookinstance.url);
      });
    }
  },
];

exports.bookinstance_delete_get = function (req, res, next) {
  async.parallel(
    {
      book_instance: function (callback) {
        BookInstance.findById(req.params.id).exec(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      if (results.book_instance == null) {
        res.redirect('/catalog/bookinstances');
      }
      res.render('bookinstance_delete', {
        title: 'Delete Book Instance',
        book_instance: results.book_instance,
      });
    }
  );
};

exports.bookinstance_delete_post = function (req, res, next) {
  async.parallel(
    {
      book_instance: function (callback) {
        BookInstance.findById(req.params.id).exec(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      BookInstance.findByIdAndRemove(
        req.body.bookinstanceid,
        function deleteBookInstance(err) {
          if (err) {
            return next(err);
          }
          res.redirect('/catalog/bookinstances');
        }
      );
    }
  );
};

exports.bookinstance_update_get = function (req, res, next) {
  async.parallel(
    {
      bookinstance: function (callback) {
        BookInstance.findById(req.params.id).exec(callback);
      },
    },

    function (err, results) {
      if (err) {
        return next(err);
      }
      Book.find({}, 'title').exec(function (err, books) {
        if (err) {
          return next(err);
        }
        let options = [
          { name: 'Maintenance' },
          { name: 'Available' },
          { name: 'Loaned' },
          { name: 'Reserved' },
        ];
        res.render('bookinstance_form', {
          title: 'Update BookInstance',
          book_list: books,
          bookinstance: results.bookinstance,
          options: options,
        });
      });
    }
  );
};

exports.bookinstance_update_post = [
  body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
  body('imprint', 'Imprint must be specified')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('status').escape(),
  body('due_back').optional({ checkFalsy: true }).isISO8601().toDate(),

  function (req, res, next) {
    const errors = validationResult(req);
    let bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
      _id: req.params.id,
    });
    if (!errors.isEmpty()) {
      Book.find({}, 'title').exec(function (err, books) {
        if (err) {
          return next(err);
        }
        res.render('bookinstance_form', {
          title: 'Update BookInstance',
          book_list: books,
          selected_book: bookinstance.book._id,
          errors: errors.array(),
          bookinstance: bookinstance,
        });
      });
      return;
    } else {
      BookInstance.findByIdAndUpdate(
        req.params.id,
        bookinstance,
        {},
        function (err, thebookinstance) {
          if (err) {
            return next(err);
          }
          res.redirect(thebookinstance.url);
        }
      );
    }
  },
];
