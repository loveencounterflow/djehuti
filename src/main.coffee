


'use strict'


#===========================================================================================================
rpr                       = ( require 'webguy' ).trm.rpr
#-----------------------------------------------------------------------------------------------------------
resolved_promise          = Promise.resolve()
# s                         = ( name ) -> Symbol.for  name
# ps                        = ( name ) -> Symbol      name
#-----------------------------------------------------------------------------------------------------------
get_WeakMap = ->
  return Map unless globalThis.WeakMap?
  try ( new WeakMap() ).set Symbol 'whatever', 123 catch error then return Map
  return globalThis.WeakMap

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
class AE_Event extends Datom

#===========================================================================================================
class AE_Event_results extends Datom

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
    @listeners    = new ( get_WeakMap() )()
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
      listener0     = receiver[ listener_name ]
      unless isa.event_listener listener0
        ### TAINT `typeof` will give some strange results ###
        throw new Error \
          "expected event_listener for object property #{rpr listener_name}, got a #{typeof listener0}"
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
    event     = new AE_Event P...
    { $key }  = event
    listeners = @_listeners_from_event event
    await resolved_promise ### as per https://github.com/sindresorhus/emittery/blob/main/index.js#L363 ###
    results = await Promise.all ( ( -> await listener event )() for listener from listeners )
    return new AE_Event_results event, results


#===========================================================================================================
AE = new Async_events()


module.exports = { AE, Async_events, AE_Event, AE_Event_results, Datom, isa, validate, isa_optional, validate_optional }
