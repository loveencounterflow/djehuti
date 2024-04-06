


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
  IT_listener:            ( x ) -> ( @function x ) or ( @asyncfunction x )
  IT_note_$key:           ( x ) -> ( @text x ) or ( @symbol x )
  nullary:                ( x ) -> x? and ( x.length is 0 )
  unary:                  ( x ) -> x? and ( x.length is 1 )
  binary:                 ( x ) -> x? and ( x.length is 2 )
  unary_or_binary:        ( x ) -> x? and ( ( x.length is 1 ) or ( x.length is 2 ) )
  binary_or_trinary:      ( x ) -> x? and ( ( x.length is 2 ) or ( x.length is 3 ) )
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
    validate.IT_note_$key @$key
    return undefined


#===========================================================================================================
class Note extends Datom

#===========================================================================================================
class Results extends Datom

  #---------------------------------------------------------------------------------------------------------
  constructor: ( note, results ) ->
    throw new Error "expected 2 arguments, got #{arguments.length}" unless isa.binary arguments
    super '$results', { note, results, }
    return undefined


#===========================================================================================================
class Intertalk

  #---------------------------------------------------------------------------------------------------------
  constructor: ->
    @symbols        = { any: ( Symbol 'any' ), }
    @key_symbols    = new Map()
    @listeners      = new ( get_WeakMap() )()
    return undefined

  #---------------------------------------------------------------------------------------------------------
  on: ( $key, listener ) ->
    ### TAINT prevent from registering a listener more than once per ae_event $key ###
    throw new Error "expected 2 arguments, got #{arguments.length}" unless isa.binary arguments
    validate.IT_note_$key $key
    validate.IT_listener  listener
    ( @_listeners_from_key $key ).push listener
    unsubscribe = ->
    return unsubscribe

  #---------------------------------------------------------------------------------------------------------
  on_any: ( listener ) ->
    validate.IT_listener listener
    ( @_listeners_from_key @symbols.any ).push listener
    unsubscribe = ->
    return unsubscribe

  #---------------------------------------------------------------------------------------------------------
  _listeners_from_key: ( $key ) ->
    ### TAINT is this necessary and does it what it intends to do? ###
    ### use Symbol, WeakMap to allow for garbage collection when `Intertalk` instance gets out of scope: ###
    unless ( key_symbol = @key_symbols.get $key )?
      @key_symbols.set $key, ( key_symbol = SYMBOLIC._unique_key_symbol_from_key $key )
    unless ( R = @listeners.get key_symbol )?
      @listeners.set key_symbol, ( R = [] )
    return R

  #---------------------------------------------------------------------------------------------------------
  emit: ( P... ) ->
    ae_event      = new Note P...
    { $key }      = ae_event
    key_listeners = @_listeners_from_key  ae_event.$key
    any_listeners = @_listeners_from_key  @symbols.any
    await resolved_promise ### as per https://github.com/sindresorhus/emittery/blob/main/index.js#L363 ###
    results = []
    results.push ( await Promise.all ( ( -> await listener ae_event )() for listener from any_listeners ) )...
    results.push ( await Promise.all ( ( -> await listener ae_event )() for listener from key_listeners ) )...
    return new Results ae_event, results

  #---------------------------------------------------------------------------------------------------------
  emit_on_event: ( element, event_name, note_name ) ->
    switch arity = arguments.length
      # when 1
      when 2 then [ element, event_name, note_name, ] = [ document, element , event_name, ]
      when 3 then null
      else validate.binary_or_trinary arguments
    handler = ( event ) => @emit note_name, event
    return element.addEventListener event_name, handler, false


#===========================================================================================================
_extras         = { Datom, isa, validate, isa_optional, validate_optional, }
module.exports  = Object.assign new Intertalk(), { Intertalk, Note, Results, _extras, }
