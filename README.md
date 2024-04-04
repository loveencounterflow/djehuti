

# InterTalk


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [InterTalk](#intertalk)
- [Is Done](#is-done)
- [To Do](#to-do)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# InterTalk


# Is Done

* **[+]** allow to use `Map` (or other suitable replacement) instead of `WeakMap` where `Symbol`s are not
  allowed as keys (true for Firefox at least up to v124.0.1)
* **[+]** fix some names:
  * class *`Async_events`* (-> `Intertalk`?)
  * class *`AE_Event`* (-> `Note`)
  * instance *`ae_event`* (-> `note`?)
  * class *`AE_Event_results`* (-> `Results`)
  * datom key *`ae_event-results`* (`$results`)

# To Do

* **[–]** event namespacing
* **[–]** export singular instance of `Intertalk`, provide other names as properties (?)
