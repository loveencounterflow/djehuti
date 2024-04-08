(function() {
  'use strict';
  var Datom, Intertalk, Note, Results, SYMBOLIC, _extras, get_WeakMap, isa, isa_optional, resolved_promise, rpr, validate, validate_optional;

  //===========================================================================================================
  rpr = (require('webguy')).trm.rpr;

  //-----------------------------------------------------------------------------------------------------------
  resolved_promise = Promise.resolve();

  // s                         = ( name ) -> Symbol.for  name
  // ps                        = ( name ) -> Symbol      name
  //-----------------------------------------------------------------------------------------------------------
  get_WeakMap = function() {
    var error;
    if (globalThis.WeakMap == null) {
      return Map;
    }
    try {
      (new WeakMap()).set(Symbol('whatever', 123));
    } catch (error1) {
      error = error1;
      return Map;
    }
    return globalThis.WeakMap;
  };

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

  //===========================================================================================================
  SYMBOLIC = class SYMBOLIC {
    //---------------------------------------------------------------------------------------------------------
    constructor() {
      throw new Error("class cannot be instantiated");
    }

    //---------------------------------------------------------------------------------------------------------
    static _text_from_key($key) {
      if (isa.symbol($key)) {
        return $key.description;
      } else {
        return $key;
      }
    }

    static _listener_name_from_key($key) {
      return 'on_' + this._text_from_key($key);
    }

    static _unique_key_symbol_from_key($key) {
      return Symbol(this._text_from_key($key));
    }

  };

  //===========================================================================================================
  Datom = class Datom {
    /* all API methods should start with `$` like `$key` and `$value` */
    //---------------------------------------------------------------------------------------------------------
    constructor($key, $value = null) {
      var $freeze, ref, ref1, values;
      if (!isa.unary_or_binary(arguments)) {
        throw new Error(`expected 1 or 2 arguments, got ${arguments.length}`);
      }
      //.......................................................................................................
      if (arguments.length === 1) {
        if (isa.object($key)) {
          $value = $key;
          $key = (ref = $value.$key) != null ? ref : null;
        }
      }
      //.......................................................................................................
      this.$key = $key;
      if (isa.object($value)) {
        values = {...$value};
        delete values.$key/* special case: ensure we don't overwrite 'explicit' `$key` */
        Object.assign(this, values);
      } else {
        if ($value != null) {
          this.$value = $value;
        }
      }
      //.......................................................................................................
      $freeze = (ref1 = validate_optional.$freeze(this.$freeze)) != null ? ref1 : true;
      delete this.$freeze;
      if ($freeze) {
        Object.freeze(this);
      }
      //.......................................................................................................
      validate.IT_note_$key(this.$key);
      return void 0;
    }

  };

  //===========================================================================================================
  Note = class Note extends Datom {};

  //===========================================================================================================
  Results = class Results extends Datom {
    //---------------------------------------------------------------------------------------------------------
    constructor(note, results) {
      if (!isa.binary(arguments)) {
        throw new Error(`expected 2 arguments, got ${arguments.length}`);
      }
      super('$results', {note, results});
      return void 0;
    }

  };

  //===========================================================================================================
  Intertalk = class Intertalk {
    //---------------------------------------------------------------------------------------------------------
    constructor() {
      this.symbols = {
        any: Symbol('any'),
        unhandled: Symbol('unhandled')
      };
      this.key_symbols = new Map();
      this.listeners = new (get_WeakMap())();
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    on($key, listener) {
      if (!isa.binary(arguments)) {
        /* TAINT prevent from registering a listener more than once per note $key */
        throw new Error(`expected 2 arguments, got ${arguments.length}`);
      }
      validate.IT_note_$key($key);
      validate.IT_listener(listener);
      (this._listeners_from_key($key)).push(listener);
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    off(listener) {
      var R, i, idx, key_symbol, ref, ref1, ref2, registered_key, registered_listeners, y;
      if (!isa.unary(arguments)) {
        /* TAINT add optional $key to unsubscribe only from specific note $key */
        throw new Error(`expected 2 arguments, got ${arguments.length}`);
      }
      validate.IT_listener(listener);
      R = 0;
      ref = this.key_symbols;
      for (y of ref) {
        [registered_key, key_symbol] = y;
        registered_listeners = (ref1 = this.listeners.get(key_symbol)) != null ? ref1 : [];
        for (idx = i = ref2 = registered_listeners.length - 1; i >= 0; idx = i += -1) {
          if (registered_listeners[idx] !== listener) {
            continue;
          }
          R++;
          registered_listeners.splice(idx, 1);
        }
      }
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    on_any(listener) {
      validate.IT_listener(listener);
      (this._listeners_from_key(this.symbols.any)).push(listener);
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    on_unhandled(listener) {
      validate.IT_listener(listener);
      (this._listeners_from_key(this.symbols.unhandled)).push(listener);
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _listeners_from_key($key) {
      var R, key_symbol;
      /* TAINT is this necessary and does it what it intends to do? */
      /* use Symbol, WeakMap to allow for garbage collection when `Intertalk` instance gets out of scope: */
      if ((key_symbol = this.key_symbols.get($key)) == null) {
        this.key_symbols.set($key, (key_symbol = SYMBOLIC._unique_key_symbol_from_key($key)));
      }
      if ((R = this.listeners.get(key_symbol)) == null) {
        this.listeners.set(key_symbol, (R = []));
      }
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    async emit(...P) {
      var $key, any_listeners, fallback_listeners, key_listeners, listener, note, results;
      note = new Note(...P);
      ({$key} = note);
      key_listeners = this._listeners_from_key(note.$key);
      any_listeners = this._listeners_from_key(this.symbols.any);
      fallback_listeners = key_listeners.length === 0 ? this._listeners_from_key(this.symbols.unhandled) : [];
      results = [];
      await resolved_promise/* as per https://github.com/sindresorhus/emittery/blob/main/index.js#L363 */
      results.push(...((await Promise.all((function() {
        var results1;
        results1 = [];
        for (listener of any_listeners) {
          results1.push((function() {
            return listener(note);
          })());
        }
        return results1;
      })()))));
      results.push(...((await Promise.all((function() {
        var results1;
        results1 = [];
        for (listener of fallback_listeners) {
          results1.push((function() {
            return listener(note);
          })());
        }
        return results1;
      })()))));
      results.push(...((await Promise.all((function() {
        var results1;
        results1 = [];
        for (listener of key_listeners) {
          results1.push((function() {
            return listener(note);
          })());
        }
        return results1;
      })()))));
      return new Results(note, results);
    }

    //---------------------------------------------------------------------------------------------------------
    emit_on_event(element, event_name, note_name) {
      var arity, handler;
      switch (arity = arguments.length) {
        // when 1
        case 2:
          [element, event_name, note_name] = [document, element, event_name];
          break;
        case 3:
          null;
          break;
        default:
          validate.binary_or_trinary(arguments);
      }
      handler = (event) => {
        return this.emit(note_name, event);
      };
      return element.addEventListener(event_name, handler, false);
    }

  };

  //===========================================================================================================
  _extras = {Datom, isa, validate, isa_optional, validate_optional};

  module.exports = {Intertalk, Note, Results, _extras};

}).call(this);

//# sourceMappingURL=main.js.map