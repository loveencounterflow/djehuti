(function() {
  'use strict';
  var isa, isa_optional, rpr, validate, validate_optional;

  //===========================================================================================================
  rpr = (require('webguy')).trm.rpr;

  //===========================================================================================================
  isa = {
    anything: function(x) {
      return true;
    },
    nothing: function(x) {
      return x == null;
    },
    something: function(x) {
      return x != null;
    },
    null: function(x) {
      return x === null;
    },
    boolean: function(x) {
      return (x === true) || (x === false);
    },
    function: function(x) {
      return (Object.prototype.toString.call(x)) === '[object Function]';
    },
    asyncfunction: function(x) {
      return (Object.prototype.toString.call(x)) === '[object AsyncFunction]';
    },
    symbol: function(x) {
      return (typeof x) === 'symbol';
    },
    object: function(x) {
      return (x != null) && (typeof x === 'object') && ((Object.prototype.toString.call(x)) === '[object Object]');
    },
    text: function(x) {
      return (typeof x) === 'string';
    },
    IT_listener: function(x) {
      return (this.function(x)) || (this.asyncfunction(x));
    },
    IT_note_$key: function(x) {
      return (this.text(x)) || (this.symbol(x));
    },
    nullary: function(x) {
      return (x != null) && (x.length === 0);
    },
    unary: function(x) {
      return (x != null) && (x.length === 1);
    },
    binary: function(x) {
      return (x != null) && (x.length === 2);
    },
    unary_or_binary: function(x) {
      return (x != null) && ((x.length === 1) || (x.length === 2));
    },
    binary_or_trinary: function(x) {
      return (x != null) && ((x.length === 2) || (x.length === 3));
    },
    $freeze: function(x) {
      return isa.boolean(x);
    }
  };

  //===========================================================================================================
  ({isa_optional, validate, validate_optional} = (() => {
    var test, type;
    isa_optional = {};
    validate = {};
    validate_optional = {};
//.........................................................................................................
    for (type in isa) {
      test = isa[type];
      ((type, test) => {
        isa_optional[type] = (x) => {
          if (x != null) {
            return test(x);
          } else {
            return true;
          }
        };
        validate_optional[type] = (x) => {
          if (x != null) {
            return validate[type](x);
          } else {
            return x;
          }
        };
        return validate[type] = (x) => {
          if (test.call(isa, x)) {
            return x;
          }
          /* TAINT `typeof` will give some strange results */
          throw new Error(`expected a ${type}, got a ${typeof x}`);
        };
      })(type, test);
    }
    //.........................................................................................................
    return {isa_optional, validate, validate_optional};
  })());

  module.exports = {isa, isa_optional, validate, validate_optional};

}).call(this);

//# sourceMappingURL=types.js.map