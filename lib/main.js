(async function() {
  'use strict';
  var AE, Async_events, Datom, Event, Event_results, SYMBOLIC, demo_1, demo_2, isa, isa_optional, ps, resolved_promise, s, validate, validate_optional;

  //===========================================================================================================
  // GUY                       = require 'guy'
  // { alert
  //   debug
  //   help
  //   info
  //   plain
  //   praise
  //   urge
  //   warn
  //   whisper }               = GUY.trm.get_loggers 'subsidiary'
  // { rpr
  //   inspect
  //   echo
  //   reverse
  //   log     }               = GUY.trm
  // # test                      = require 'guy-test'
  // #...........................................................................................................
  resolved_promise = Promise.resolve();

  s = function(name) {
    return Symbol.for(name);
  };

  ps = function(name) {
    return Symbol(name);
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
  Event = class Event extends Datom {};

  //===========================================================================================================
  Event_results = class Event_results extends Datom {
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
        listener0 = validate.event_listener(receiver[listener_name]);
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
      event = new Event(...P);
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
      return new Event_results(event, results);
    }

  };

  //===========================================================================================================
  AE = new Async_events();

  //===========================================================================================================
  demo_1 = async function() {
    var e, receiver;
    receiver = {
      on_square: function(event) {
        info('^992-4^', event);
        return event.$value ** 2;
      },
      on_cube: function(event) {
        info('^992-6^', event);
        return event.$value ** 3;
      },
      on_double: function(event) {
        info('^992-5^', event);
        return event.$value * 2;
      },
      on_any: function(event) {
        return info('^992-5^', event);
      },
      on_cube_symbol: function(event) {
        info('^992-6^', event);
        return event.$value ** 3;
      }
    };
    AE.on('square', receiver);
    AE.on('double', receiver);
    AE.on('cube', receiver.on_cube);
    AE.on(s`cube`, receiver.on_cube);
    AE.on('*', receiver.on_any);
    // urge '^992-7^', AE
    // urge '^992-8^', AE.key_symbols[ 'square' ]
    // urge '^992-9^', AE.listeners
    // urge '^992-10^', AE.listeners.get AE.key_symbols[ 'square' ]
    urge('^992-11^', (await AE.emit('square', 11)));
    urge('^992-12^', (await AE.emit('double', 12)));
    urge('^992-13^', (await AE.emit('cube', 13)));
    urge('^992-13^', (await AE.emit(new Event('cube', 14))));
    urge('^992-13^', (await AE.emit(new Event(s`cube`, 14))));
    try {
      /* TAINT should not be accepted, emit 1 object or 1 key plus 0-1 data: */
      urge('^992-14^', (await AE.emit('double', 3, 4, 5, 6)));
    } catch (error) {
      e = error;
      warn('^992-15^', reverse(e.message));
    }
    try {
      urge('^992-16^', (await AE.emit('foo', 3, [4, 5, 6])));
    } catch (error) {
      e = error;
      warn('^992-17^', reverse(e.message));
    }
    urge('^992-18^', (await AE.emit('foo', [3, 4, 5, 6])));
    return null;
  };

  //===========================================================================================================
  demo_2 = async function() {
    var A, B, e;
    A = class A {};
    B = class B extends Object {};
    urge('^992-19^', A);
    urge('^992-20^', A.freeze);
    urge('^992-21^', new A());
    urge('^992-22^', B);
    urge('^992-23^', new B());
    urge('^992-24^', isa.object(A));
    urge('^992-25^', isa.object(B));
    urge('^992-26^', isa.object(new A()));
    urge('^992-27^', isa.object(new B()));
    try {
      new Datom();
    } catch (error) {
      e = error;
      warn('^992-28^', reverse(e.message));
    }
    try {
      new Datom(5);
    } catch (error) {
      e = error;
      warn('^992-29^', reverse(e.message));
    }
    try {
      new Datom(null);
    } catch (error) {
      e = error;
      warn('^992-30^', reverse(e.message));
    }
    try {
      new Datom({});
    } catch (error) {
      e = error;
      warn('^992-31^', reverse(e.message));
    }
    urge('^992-32^', new Datom('foo'));
    urge('^992-33^', new Datom('foo', null));
    urge('^992-34^', new Datom('foo', void 0));
    urge('^992-35^', new Datom('foo', 56));
    urge('^992-36^', new Datom('foo', {
      bar: 56
    }));
    urge('^992-37^', new Datom('foo', {
      bar: 56,
      $key: 'other'
    }));
    urge('^992-38^', new Datom(s`foo`, {
      bar: 56,
      $key: 'other'
    }));
    urge('^992-39^', new Datom({
      bar: 56,
      $key: 'other'
    }));
    urge('^992-40^', new Datom({
      bar: 56,
      $key: 'other',
      $freeze: false
    }));
    urge('^992-41^', new Datom({
      bar: 56,
      $key: 'other',
      $freeze: true
    }));
    urge('^992-42^', new Datom({
      bar: 56,
      $key: 'other',
      $freeze: null
    }));
    urge('^992-43^', new Datom('something', {
      $freeze: false
    }));
    urge('^992-44^', new Datom('something', {
      $freeze: true
    }));
    urge('^992-45^', new Datom('something', {
      $freeze: null
    }));
    (() => {      //.........................................................................................................
      /* must set `{ $freeze: false, }` explicitly else datom will be (superficially) frozen: */
      var d;
      d = new Datom('o', {
        $freeze: false
      });
      d.p = 7;
      urge('^992-46^', d);
      return null;
    })();
    (() => {      //.........................................................................................................
      /* passing in an existing datom (or event) `d` into `new Datom d` (or `new Event d`) results in a copy
       of `d`: */
      var d;
      d = new Datom('o', {
        $freeze: false
      });
      e = new Datom(d);
      urge('^992-47^', d, e, d === e);
      return null;
    })();
    //.........................................................................................................
    /* events are just `Datom`s: */
    urge('^992-48^', new Event(s`foo`, {
      bar: 56
    }));
    await (async() => {      //.........................................................................................................
      /* calls to `emit` are just calls to `new Event()`: */
      AE.on('myevent', function(event) {
        info('^992-49^', event);
        return event.n ** 2;
      });
      help('^992-50^', (await AE.emit('myevent', {
        n: 16
      })));
      return null;
    })();
    //.........................................................................................................
    return null;
  };

  //===========================================================================================================
  if (module === require.main) {
    await (async() => {
      return (await demo_1());
    })();
  }

  // await demo_2()
// await demo_3()
// urge '^992-51^', await Promise.all (
//   # new Promise ( ( resolve, reject ) -> resolve i ) for i in [ 1 .. 10 ]
//   ( ( ( count ) -> await count ) i + 1 ) for i in [ 1 .. 10 ]
//   )

}).call(this);

//# sourceMappingURL=main.js.map