

# InterTalk


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [InterTalk](#intertalk)
  - [API](#api)
  - [Is Done](#is-done)
  - [To Do](#to-do)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# InterTalk

## API

* `emit_on_event: ( element, event_name, note_name ) ->` (only in browser): given a DOM `element`, a DOM
  `event_name` and a `note` name, when a matching event is triggered on the element, emit a note with `$key:
  note_name` and `$value: event`
  * when `emit_on_event` is called with the arguments `( event_name, note_name )` then the event listener
    will be attached to `document`: `IT.emit_on_event div_1, 'click', 'bar'` will be triggered when clicking
    on the `div_1` element only, but `IT.emit_on_event 'click', 'bar'` will be triggered by any click
    anywhere within the browser document window.

* `off: ( listener ) ->`: unsubscribe `listener` from any events.

## Is Done

* **[+]** allow to use `Map` (or other suitable replacement) instead of `WeakMap` where `Symbol`s are not
  allowed as keys (true for Firefox at least up to v124.0.1)
* **[+]** fix some names:
  * class *`Async_events`* (-> `Intertalk`?)
  * class *`AE_Event`* (-> `Note`)
  * instance *`ae_event`* (-> `note`?)
  * class *`AE_Event_results`* (-> `Results`)
  * datom key *`ae_event-results`* (`$results`)
* **[+]** export singular instance of `Intertalk`, provide other names as properties (?)
* **[+]** remove ability to discover suitably named note listeners on objects as it only leads to
  complications
* **[+]** <del>reconstruct listener registration:
  * in a `Map` (needed for symbol `$key`s), store `WeakSet`s as values,
  * likewise, make `Intertalk#any_listeners` a `WeakMap`
  * may later want to cache association between `$key`s and `listener`s to avoid to re-construct sets</del>
* **[+]** implement `on_any()` or similar to catch all emitted `note`s
* **[+]** implement `off()` to unsubscribe a listener
* **[+]** implement `on_unhandled()` or similar to catch all `note`s that were emitted but not listened to

## To Do

* **[–]** event namespacing
* **[–]** in `emit_on_event()`, allow to transform / add attributes to outgoing `note`
* **[–]** <del>implement `once()` for listeners that should only receive a single `note` (this requires
  implementing `off()`)</del> <del>implement returning a 'command' instance that may contain the listener's
  results, if any, but also controls how to deal with the current note and whether or not to unsubscribe the
  listener. **Alternatively**, either (1)</del> pass in a second argument (dubbed `control` or `ctrl`) that
  contains methods to unsubscribe, cancel &c<del>, or (2) describe how to achieve this by using the `intertalk`
  instance's methods</del>
  * `off: () ->`: unsubscribe this listener from this `$key`
  * `off_all: () ->`: unsubscribe this listener from all keys, including `any` and fallback subscriptions

* **[–]** implement note cancellation / note rewrite
