

# ⚚ Djehuti 𓆓𓎛𓅱𓏏𓏭𓊹


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [⚚ Djehuti <table><tr><td>𓆓𓎛𓅱</td><td>𓏏</td><td>𓏭</td><td>𓊹</td></tr></table>](#%E2%9A%9A-djehuti-tabletrtd%F0%93%86%93%F0%93%8E%9B%F0%93%85%B1tdtd%F0%93%8F%8Ftdtd%F0%93%8F%ADtdtd%F0%93%8A%B9tdtrtable)
  - [Preliminary Docs](#preliminary-docs)
    - [XE Sending API](#xe-sending-api)
    - [XE Receiving API](#xe-receiving-api)
    - [Sample](#sample)
    - [Managing Scope](#managing-scope)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# ⚚ Djehuti <table><tr><td>𓆓𓎛𓅱</td><td>𓏏</td><td>𓏭</td><td>𓊹</td></tr></table>

## Preliminary Docs

### XE Sending API

* **`XE.emit = ( key, d ) ->`** emit (a.k.a. 'publish', 'send to whom it may concern') an event. To
  be called either as `XE.emit '^mykey', 'myvalue'` or as `XE.emit PD.new_event '^mykey', 'myvalue'` (in
  which latter case the datom's key will become the channel key). When called with await as in
  `return_values = await XE.emit '^foo', ...`, `return_values` will be a list with all values returned by
  all listeners that got called for this event.

* **`XE.delegate = ( key, d ) ->`** like `XE.emit()` but will pick out and unwrap the event value
  from the event contractor (see below). If no event contractor was listening, an error will be raised.

### XE Receiving API

* **`XE.listen_to_all = ( listener ) ->`** Register a listener for all events.

* **`XE.listen_to_unheard = ( listener ) ->`** Register a listener for all events that do not have a
  listener or a contractor.

* **`XE.listen_to     = ( key, listener ) ->`** Register a listener for events that match `key`. No
  pattern matching is implemented atm, so you can only listen to all keys or a single key.

* **`XE.contract      = ( key, listener ) ->`** Register a contractor (a.k.a. 'result producer') for
  events that match `key`.

<!-- The above methods—`XE.listen_to_all()`, `XE.listen_to()` and `XE.contract()`—will return an `unsubscribe()`
function that, when called once, will unsubscribe the event listener from the event.
 -->

### Sample

```coffee
PD                        = require 'pipedreams'
defer                     = setImmediate
XE                        = PD.XE.new_scope()

#-----------------------------------------------------------------------------------------------------------
### Register a 'contractor' (a.k.a. 'result producer') for `^plus-async` events; observe that asynchronous
contractors should return a promise: ###
XE.contract '^plus-async', ( d ) =>
  return new Promise ( resolve, reject ) =>
    defer => resolve d.value.a + d.value.b

############################################################################################################
do =>
  info 'µ28823-5', await XE.emit PD.new_event '^plus-async', { a: 42, b: 108, }
  # in case other listeners were registered that returned values like `'listener #1'` and so on, the
  # returned list of values might look like:
  # -> [ 'listener #4', { key: '~xemitter-preferred', value: 150 }, 'listener #1', 'listener #2' ]

  ### When using `delegate()` instead of `emit()`, the preferred value (a.k.a. '*the* event result')
  will be picked out of the list and unwrapped for you: ###
  info 'µ28823-6', await XE.delegate PD.new_event '^plus-async', { a: 42, b: 108, }
  # -> 150

```

For a demo with more coverage, have a look at
[experiments/demo-xemitter.coffee](https://github.com/loveencounterflow/pipedreams/blob/master/blob/master/src/experiments/demo-xemitter.coffee).

### Managing Scope

Typically, you'll start using XEmitter with `XE = PD.XE.new_scope()`; this creates a new 'scope' for events.
Only methods that emit and listen to the same scope can exchange messages. When used within an application,
you will want to publish that scope to all participating modules; one way to do so is to write a dedicated
module with a single line in it, `module.exports = ( require 'pipedreams' ).XE.new_scope()`.




