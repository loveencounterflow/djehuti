


'use strict'


#===========================================================================================================
# GUY                       = require 'guy'
# { alert
#   debug
#   help
#   info
#   plain
#   praise
#   urge
#   warn
#   whisper }               = GUY.trm.get_loggers 'subsidiary'
# { rpr
#   inspect
#   echo
#   reverse
#   log     }               = GUY.trm
# # test                      = require 'guy-test'
# #...........................................................................................................
resolved_promise          = Promise.resolve()
s                         = ( name ) -> Symbol.for  name
ps                        = ( name ) -> Symbol      name


#===========================================================================================================
isa =
  anything:               ( x ) -> true
  nothing:                ( x ) -> not x?
  something:              ( x ) -> x?
  boolean:                ( x ) -> ( x is true ) or ( x is false )
  function:               ( x ) -> ( Object::toString.call x ) is '[object Function]'
  asyncfunction:          ( x ) -> ( Object::toString.call x ) is '[object AsyncFunction]'
  symbol:                 ( x ) -> ( typeof x ) is 'symbol'
  object:                 ( x ) -> x? and ( typeof x is 'object' ) and ( ( Object::toString.call x ) is '[object Object]' )
  text:                   ( x ) -> ( typeof x ) is 'string'
  event_listener:         ( x ) -> ( @function x ) or ( @asyncfunction x )
  event_key:              ( x ) -> ( @text x ) or ( @symbol x )
  nullary:                ( x ) -> x? and ( x.length is 0 )
  unary:                  ( x ) -> x? and ( x.length is 1 )
  binary:                 ( x ) -> x? and ( x.length is 2 )
  unary_or_binary:        ( x ) -> x? and ( ( x.length is 1 ) or ( x.length is 2 ) )
  $freeze:                ( x ) -> isa.boolean x


#===========================================================================================================
{ isa_optional
  validate
  validate_optional } = do =>
  isa_optional      = {}
  validate          = {}
  validate_optional = {}
  #.........................................................................................................
  for type, test of isa
    do ( type, test ) =>
      isa_optional[       type ] = ( x ) => if x? then ( test x )             else true
      validate_optional[  type ] = ( x ) => if x? then ( validate[ type ] x ) else x
      validate[           type ] = ( x ) =>
        return x if test.call isa, x
        ### TAINT `typeof` will give some strange results ###
        throw new Error "expected a #{type}, got a #{typeof x}"
  #.........................................................................................................
  return { isa_optional, validate, validate_optional, }


#===========================================================================================================
class SYMBOLIC

  #---------------------------------------------------------------------------------------------------------
  constructor: -> throw new Error "class cannot be instantiated"

  #---------------------------------------------------------------------------------------------------------
  @_text_from_key:              ( $key ) -> if isa.symbol $key then $key.description else $key
  @_listener_name_from_key:     ( $key ) -> 'on_' + @_text_from_key $key
  @_unique_key_symbol_from_key: ( $key ) -> Symbol @_text_from_key $key


#===========================================================================================================
class Datom
  ### all API methods should start with `$` like `$key` and `$value` ###

  #---------------------------------------------------------------------------------------------------------
  constructor: ( $key, $value = null ) ->
    throw new Error "expected 1 or 2 arguments, got #{arguments.length}" unless isa.unary_or_binary arguments
    #.......................................................................................................
    if arguments.length is 1
      if isa.object $key
        $value = $key
        $key   = $value.$key ? null
    #.......................................................................................................
    @$key = $key
    if isa.object $value
      values = { $value..., }
      delete values.$key ### special case: ensure we don't overwrite 'explicit' `$key` ###
      Object.assign @, values
    else
      @$value = $value if $value?
    #.......................................................................................................
    $freeze = ( validate_optional.$freeze @$freeze ) ? true
    delete @$freeze
    Object.freeze @ if $freeze
    #.......................................................................................................
    validate.event_key @$key
    return undefined


#===========================================================================================================
class Event extends Datom

#===========================================================================================================
class Event_results extends Datom

  #---------------------------------------------------------------------------------------------------------
  constructor: ( event, results ) ->
    throw new Error "expected 2 arguments, got #{arguments.length}" unless isa.binary arguments
    super 'event-results', { event, results, }
    return undefined


#===========================================================================================================
class Async_events

  #---------------------------------------------------------------------------------------------------------
  constructor: ->
    @key_symbols  = new Map
    @listeners    = new WeakMap()
    return undefined

  #---------------------------------------------------------------------------------------------------------
  on: ( $key, receiver ) ->
    ### TAINT prevent from registering a listener more than once per event $key ###
    throw new Error "expected 2 arguments, got #{arguments.length}" unless isa.binary arguments
    validate.event_key $key
    validate.something receiver
    #.......................................................................................................
    ### if receiver is a callable, use it; else, try to retrieve a suitably named method and use that: ###
    if isa.event_listener receiver
      listener      = receiver
    else
      listener_name = SYMBOLIC._listener_name_from_key $key
      listener0     = validate.event_listener receiver[ listener_name ]
      listener      = ( P... ) -> await listener0.call receiver, P...
    #.......................................................................................................
    ( @_listeners_from_key $key ).push listener
    unsubscribe = ->
    return unsubscribe

  #---------------------------------------------------------------------------------------------------------
  _listeners_from_key: ( $key ) ->
    ### TAINT is this necessary and does it what it intends to do? ###
    ### use Symbol, WeakMap to allow for garbage collection when `Async_events` instance gets out of scope: ###
    unless ( key_symbol = @key_symbols.get $key )?
      @key_symbols.set $key, ( key_symbol = SYMBOLIC._unique_key_symbol_from_key $key )
    unless ( R = @listeners.get key_symbol )?
      @listeners.set key_symbol, ( R = [] )
    return R

  #---------------------------------------------------------------------------------------------------------
  _listeners_from_event: ( event ) ->
    listeners   = @_listeners_from_key event.$key
    return listeners ? []

  #---------------------------------------------------------------------------------------------------------
  emit: ( P... ) ->
    event     = new Event P...
    { $key }  = event
    listeners = @_listeners_from_event event
    await resolved_promise ### as per https://github.com/sindresorhus/emittery/blob/main/index.js#L363 ###
    results = await Promise.all ( ( -> await listener event )() for listener from listeners )
    return new Event_results event, results


#===========================================================================================================
AE = new Async_events()

#===========================================================================================================
demo_1 = ->
  receiver =
    on_square:      ( event ) -> info '^992-4^', event; event.$value ** 2
    on_cube:        ( event ) -> info '^992-6^', event; event.$value ** 3
    on_double:      ( event ) -> info '^992-5^', event; event.$value *  2
    on_any:         ( event ) -> info '^992-5^', event
    on_cube_symbol: ( event ) -> info '^992-6^', event; event.$value ** 3
  AE.on 'square',   receiver
  AE.on 'double',   receiver
  AE.on 'cube',     receiver.on_cube
  AE.on s'cube',    receiver.on_cube
  AE.on '*',        receiver.on_any
  # urge '^992-7^', AE
  # urge '^992-8^', AE.key_symbols[ 'square' ]
  # urge '^992-9^', AE.listeners
  # urge '^992-10^', AE.listeners.get AE.key_symbols[ 'square' ]
  urge '^992-11^', await AE.emit            'square', 11
  urge '^992-12^', await AE.emit            'double', 12
  urge '^992-13^', await AE.emit            'cube',   13
  urge '^992-13^', await AE.emit new Event  'cube',   14
  urge '^992-13^', await AE.emit new Event  s'cube',  14
  ### TAINT should not be accepted, emit 1 object or 1 key plus 0-1 data: ###
  try ( urge '^992-14^', await AE.emit 'double', 3, 4, 5, 6      ) catch e then warn '^992-15^', reverse e.message
  try ( urge '^992-16^', await AE.emit 'foo', 3, [ 4, 5, 6, ] ) catch e then warn '^992-17^', reverse e.message
  urge '^992-18^', await AE.emit 'foo', [ 3, 4, 5, 6, ]
  return null

#===========================================================================================================
demo_2 = ->
  class A
  class B extends Object
  urge '^992-19^', A
  urge '^992-20^', A.freeze
  urge '^992-21^', new A()
  urge '^992-22^', B
  urge '^992-23^', new B()
  urge '^992-24^', isa.object A
  urge '^992-25^', isa.object B
  urge '^992-26^', isa.object new A()
  urge '^992-27^', isa.object new B()
  try new Datom()     catch e then warn '^992-28^', reverse e.message
  try new Datom 5     catch e then warn '^992-29^', reverse e.message
  try new Datom null  catch e then warn '^992-30^', reverse e.message
  try new Datom {}    catch e then warn '^992-31^', reverse e.message
  urge '^992-32^', new Datom 'foo'
  urge '^992-33^', new Datom 'foo', null
  urge '^992-34^', new Datom 'foo', undefined
  urge '^992-35^', new Datom 'foo', 56
  urge '^992-36^', new Datom 'foo', { bar: 56, }
  urge '^992-37^', new Datom 'foo', { bar: 56, $key: 'other', }
  urge '^992-38^', new Datom s'foo', { bar: 56, $key: 'other', }
  urge '^992-39^', new Datom { bar: 56, $key: 'other', }
  urge '^992-40^', new Datom { bar: 56, $key: 'other', $freeze: false, }
  urge '^992-41^', new Datom { bar: 56, $key: 'other', $freeze: true, }
  urge '^992-42^', new Datom { bar: 56, $key: 'other', $freeze: null, }
  urge '^992-43^', new Datom 'something', { $freeze: false, }
  urge '^992-44^', new Datom 'something', { $freeze: true,  }
  urge '^992-45^', new Datom 'something', { $freeze: null,  }
  #.........................................................................................................
  ### must set `{ $freeze: false, }` explicitly else datom will be (superficially) frozen: ###
  do =>
    d = new Datom 'o', { $freeze: false, }
    d.p = 7
    urge '^992-46^', d
    return null
  #.........................................................................................................
  ### passing in an existing datom (or event) `d` into `new Datom d` (or `new Event d`) results in a copy
  of `d`: ###
  do =>
    d = new Datom 'o', { $freeze: false, }
    e = new Datom d
    urge '^992-47^', d, e, d is e
    return null
  #.........................................................................................................
  ### events are just `Datom`s: ###
  urge '^992-48^', new Event s'foo', { bar: 56, }
  #.........................................................................................................
  ### calls to `emit` are just calls to `new Event()`: ###
  await do =>
    AE.on 'myevent', ( event ) -> info '^992-49^', event; event.n ** 2
    help '^992-50^', await AE.emit 'myevent', { n: 16, }
    return null
  #.........................................................................................................
  return null


#===========================================================================================================
if module is require.main then await do =>
  await demo_1()
  # await demo_2()
  # await demo_3()
  # urge '^992-51^', await Promise.all (
  #   # new Promise ( ( resolve, reject ) -> resolve i ) for i in [ 1 .. 10 ]
  #   ( ( ( count ) -> await count ) i + 1 ) for i in [ 1 .. 10 ]
  #   )



