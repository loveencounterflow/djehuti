

'use strict'


#===========================================================================================================
rpr                       = ( require 'webguy' ).trm.rpr

#===========================================================================================================
isa =
  anything:               ( x ) -> true
  nothing:                ( x ) -> not x?
  something:              ( x ) -> x?
  null:                   ( x ) -> x is null
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

module.exports = { isa, isa_optional, validate, validate_optional, }
