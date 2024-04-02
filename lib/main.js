(function() {
  'use strict';
  var AE, AE_Event, AE_Event_results, Async_events, Datom, SYMBOLIC, isa, isa_optional, resolved_promise, validate, validate_optional;

  //===========================================================================================================
  resolved_promise = Promise.resolve();

  // s                         = ( name ) -> Symbol.for  name
  // ps                        = ( name ) -> Symbol      name

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
    event_listener: function(x) {
      return (this.function(x)) || (this.asyncfunction(x));
    },
    event_key: function(x) {
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
      validate.event_key(this.$key);
      return void 0;
    }

  };

  //===========================================================================================================
  AE_Event = class AE_Event extends Datom {};

  //===========================================================================================================
  AE_Event_results = class AE_Event_results extends Datom {
    //---------------------------------------------------------------------------------------------------------
    constructor(event, results) {
      if (!isa.binary(arguments)) {
        throw new Error(`expected 2 arguments, got ${arguments.length}`);
      }
      super('event-results', {event, results});
      return void 0;
    }

  };

  //===========================================================================================================
  Async_events = class Async_events {
    //---------------------------------------------------------------------------------------------------------
    constructor() {
      this.key_symbols = new Map();
      this.listeners = new WeakMap();
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    on($key, receiver) {
      var listener, listener0, listener_name, unsubscribe;
      if (!isa.binary(arguments)) {
        /* TAINT prevent from registering a listener more than once per event $key */
        throw new Error(`expected 2 arguments, got ${arguments.length}`);
      }
      validate.event_key($key);
      validate.something(receiver);
      //.......................................................................................................
      /* if receiver is a callable, use it; else, try to retrieve a suitably named method and use that: */
      if (isa.event_listener(receiver)) {
        listener = receiver;
      } else {
        listener_name = SYMBOLIC._listener_name_from_key($key);
        listener0 = receiver[listener_name];
        if (!isa.event_listener(listener0)) {
          /* TAINT `typeof` will give some strange results */
          /* TAINT use `rpr()` to quote property name */
          throw new Error(`expected event_listener for object property ${listener_name}, got a ${typeof listener0}`);
        }
        listener = async function(...P) {
          return (await listener0.call(receiver, ...P));
        };
      }
      //.......................................................................................................
      (this._listeners_from_key($key)).push(listener);
      unsubscribe = function() {};
      return unsubscribe;
    }

    //---------------------------------------------------------------------------------------------------------
    _listeners_from_key($key) {
      var R, key_symbol;
      /* TAINT is this necessary and does it what it intends to do? */
      /* use Symbol, WeakMap to allow for garbage collection when `Async_events` instance gets out of scope: */
      if ((key_symbol = this.key_symbols.get($key)) == null) {
        this.key_symbols.set($key, (key_symbol = SYMBOLIC._unique_key_symbol_from_key($key)));
      }
      if ((R = this.listeners.get(key_symbol)) == null) {
        this.listeners.set(key_symbol, (R = []));
      }
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    _listeners_from_event(event) {
      var listeners;
      listeners = this._listeners_from_key(event.$key);
      return listeners != null ? listeners : [];
    }

    //---------------------------------------------------------------------------------------------------------
    async emit(...P) {
      var $key, event, listener, listeners, results;
      event = new AE_Event(...P);
      ({$key} = event);
      listeners = this._listeners_from_event(event);
      await resolved_promise/* as per https://github.com/sindresorhus/emittery/blob/main/index.js#L363 */
      results = (await Promise.all((function() {
        var results1;
        results1 = [];
        for (listener of listeners) {
          results1.push((async function() {
            return (await listener(event));
          })());
        }
        return results1;
      })()));
      return new AE_Event_results(event, results);
    }

  };

  //===========================================================================================================
  AE = new Async_events();

  module.exports = {AE, Async_events, AE_Event, AE_Event_results, Datom, isa, validate, isa_optional, validate_optional};

}).call(this);

//# sourceMappingURL=main.js.map