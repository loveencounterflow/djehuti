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
  ({isa, isa_optional, validate, validate_optional} = require('./types'));

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
      var ctl;
      if (!isa.binary(arguments)) {
        /* TAINT prevent from registering a listener more than once per note $key */
        throw new Error(`expected 2 arguments, got ${arguments.length}`);
      }
      validate.IT_note_$key($key);
      validate.IT_listener(listener);
      ctl = this._get_ctl($key, listener);
      (this._listeners_from_key($key)).push([listener, ctl]);
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    unsubscribe($key, listener) {
      var R, arity, ctl, i, idx, key_symbol, ref, ref1, ref2, registered_key, registered_listener, registered_listeners_and_ctls, x;
      switch (arity = arguments.length) {
        case 1:
          [$key, listener] = [null, $key];
          break;
        case 2:
          null;
          break;
        default:
          throw new Error(`expected 1 or 2 arguments, got ${arity}`);
      }
      validate_optional.IT_note_$key($key);
      validate.IT_listener(listener);
      R = 0;
      ref = this.key_symbols;
      for (x of ref) {
        [registered_key, key_symbol] = x;
        if (($key != null) && ($key !== registered_key)) {
          continue;
        }
        registered_listeners_and_ctls = (ref1 = this.listeners.get(key_symbol)) != null ? ref1 : [];
        for (idx = i = ref2 = registered_listeners_and_ctls.length - 1; i >= 0; idx = i += -1) {
          [registered_listener, ctl] = registered_listeners_and_ctls[idx];
          if (registered_listener !== listener) {
            continue;
          }
          R++;
          registered_listeners_and_ctls.splice(idx, 1);
        }
      }
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    on_any(listener) {
      return this.on(this.symbols.any, listener);
    }

    on_unhandled(listener) {
      return this.on(this.symbols.unhandled, listener);
    }

    //---------------------------------------------------------------------------------------------------------
    _get_ctl($key, listener) {
      var R;
      return R = {
        unsubscribe_this: () => {
          return this.unsubscribe($key, listener);
        },
        unsubscribe_all: () => {
          return this.unsubscribe(listener);
        }
      };
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
      var $key, any_listeners, ctl, fallback_listeners, key_listeners, lstnr, note, results;
      note = new Note(...P);
      ({$key} = note);
      key_listeners = this._listeners_from_key(note.$key);
      any_listeners = this._listeners_from_key(this.symbols.any);
      fallback_listeners = key_listeners.length === 0 ? this._listeners_from_key(this.symbols.unhandled) : [];
      results = [];
      await resolved_promise/* as per https://github.com/sindresorhus/emittery/blob/main/index.js#L363 */
      results.push(...((await Promise.all((function() {
        var results1, x;
        results1 = [];
        for (x of any_listeners) {
          [lstnr, ctl] = x;
          results1.push((function() {
            return lstnr(note, ctl);
          })());
        }
        return results1;
      })()))));
      results.push(...((await Promise.all((function() {
        var results1, x;
        results1 = [];
        for (x of fallback_listeners) {
          [lstnr, ctl] = x;
          results1.push((function() {
            return lstnr(note, ctl);
          })());
        }
        return results1;
      })()))));
      results.push(...((await Promise.all((function() {
        var results1, x;
        results1 = [];
        for (x of key_listeners) {
          [lstnr, ctl] = x;
          results1.push((function() {
            return lstnr(note, ctl);
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

  module.exports = {
    Intertalk,
    Note,
    Results,
    _extras,
    version: (require('../package.json')).version
  };

}).call(this);

//# sourceMappingURL=main.js.map