/*2017.11. by kelly*/
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? (module.exports = factory()) :
    typeof define === 'function' && define.amd ? define(factory) : (function () {
      global.$vv = factory();
    })();
})(this, function () {

  var REQUIRED = 'required';
  var slice = [].slice;
  var isArray = Array.isArray;

  function isNumber (n) {
    // n===n is for NaN
    return typeof n === 'number' && n === n;
  }
  function isUndef (un){
    return un === void(0)
  }
  function isString (str) {
    return typeof str === 'string';
  }

  function isFunction (str) {
    return typeof str === 'function';
  }

  function isObject (obj) {
    return typeof obj === 'object' && !Array.isArray(obj);
  }

  function isBoolean (bool) {
    return typeof bool === 'boolean'
  }

  var _config = {
    box: 'msg-box', //msg-box class, no padding, no
    msg: 'msg-box-msg', //msg-box
    waiver: 'dirty',
    event: 'change',
    getDefaultMsg: function (rule) {
      return rule + ' : entered wrong'
    },
    display: function (errors) {
      var str = errors[ 0 ] ? errors[ 0 ][ 1 ] : ''
      this.showMessage(str);
    }
  }

  Validator.prototype.showMessage = function (str) {
    if ( _prevMessage[ this.id ] === str ) {
      return;
    }
    if ( !str ) {
      this.hideMsgBox();
    } else {
      this.$msgBox.innerHTML = str;
      this.showMsgBox();
    }
    _prevMessage[ this.id ] = str;
  }

  var errMsg = {
    password: function (param) {
      return 'Password should include uppercase, lowercase, digit and the special character(@$!%*?&#+-_) with 8 to 12 letters.'
    },
    email: function (param) {
      return 'Not correct email format.'
    },
    confirm: function (param) {
      return 'password and confirming password are not identical.'
    },
    required: function (param) {
      return 'This field is required.'
    },
    numeric: function (param) {
      return 'It should be numbers only'
    },
    min: function (param) {
      return 'should be more than ' + param + ' letters';
    },
    max: function (param) {
      return 'should be less than ' + param + ' letters';
    }
  }

  var _vRule = {
    email: function (value) {
      return /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(value)
    },
    required: function (value) {
      if ( isBoolean(value) ) {
        return value
      } else {
        return String(value).trim().length
      }
    },
    password: function (value) {
      return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_])[A-Za-z\d@$!%*?&#+\-_]{8,12}$/.test(value)
    },
    confirm: function (value, extra) {
      return value === extra.$el.value
    },
    numeric: function (value) {
      return /^\d+$/.test(value);
    },
    min: function (value, minLen) {
      if ( isNumber(minLen) ) {
        return value.length >= minLen
      } else {
        return true;
      }
    },
    max: function (value, maxLen) {
      if ( isNumber(maxLen) ) {
        return value.length <= maxLen
      } else {
        return true;
      }
    }
  };
  var _refineValue = {
    toNumbers: function(v){
      return parseFloat(v);
    },
    toDigits: function(v){
      return v.toString().replace(/\D/ig,'');
    }
  }

  function setReactive (obj, prop, val, callback) {

    Object.defineProperty(obj, prop, {
      get: function () {
        return val;
      },
      set: function (newVal) {
        val = newVal;
        callback(val);
      }
    })
  }

  function merge (to, from) {
    if ( !from ) {
      return to;
    }
    for ( var i in from ) {
      to[ i ] = from [ i ]
    }
    return to;
  }

  function sortRequiredFirst (rules) {
    return Object.keys(rules).sort(function(a,b){
      return a === REQUIRED ? -1: 0;
    }).reduce(function(p,c){
      p[c] = rules[c];
      return p;
    },{})
  }

  // public method
  function config (c) {
    merge(_config, c);

    // if wrong value entered
    if ( _config.waiver !== 'dirty' && _config.waiver !== 'touched' ) {
      _config.waiver = 'dirty'
    }
  }

  // public method
  function addRule (name, fn, msg) {
    if ( !name ) {
      return false;
    }
    if ( isObject(name) ) {
      merge(_vRule, name);
    } else if ( isString(name) && isFunction(fn) ) {
      _vRule[ name ] = fn;
      if ( msg ) {
        errMsg[ name ] = msg;
      }
    }
  }

// public method
  function dictionary (name, msg) {
    if ( !name ) {
      consoleWarn('dictionary needs its rule name');
      return false;
    }
    if ( isObject(name) ) {
      merge(errMsg, name);
    } else if ( isString(name) && ( isFunction(msg) || isString(msg) ) ) {
      errMsg[ name ] = msg;
    }
  }

  //msgBox
  function getMsgBox (el) {
    var msgbox = el.parentNode.querySelector('.' + _config.box) || makeMsgBox(el);
    return msgbox;
  }

  function makeMsgBox (el) {
    var div = document.createElement('div');
    div.classList.add(_config.box);
    el.parentNode.appendChild(div);
    return div;
  }

  function attachEventUtil (elem, evt, fn) {
    elem.addEventListener(evt, fn, false);
    return elem.removeEventListener.bind(elem, evt, fn, false);
  }

  function consoleWarn (msg) {
    console.warn(msg);
  }

  var id = 0;

  var _handlers = {};
  var _errors = {};
  var _truthy = {};
  var _reactiveObj = {};
  var _prevMessage = {}
  var _validateEvent = {}
  // prevent error of calling function when function is not prevented
  var noop = function () {
  };

  // has a value that doesn't concern key events
  function isNoKeyType(v){
    return [ 'select', 'radio', 'checkbox', 'range' ].some(function(c){
      return c === v
    })
  }
  function changeValue (self, value) {
    // no value returned from formatter or value doesn't concern key events;
    if ( isUndef(value) || isNoKeyType(self.type) ) {
      return;
    }
    self.$el.value = value;
  }

  function loop (evt, e) {
    var handler = _handlers[ this.id ].handlers[ evt ];
    handler.forEach(function (fn) {
      fn.call(this, e)
    }, this);
  }

  function markDirty (e) {
    this.dirty = true;
  }

  function markTouched (e) {
    this.touched = true;
  }

  function isValidatorObj (obj) {
    return obj.constructor === Validator
  }

  Validator.prototype.validate = _validate;
  /*
   * add remove rules to the Validator Instance
   * */
  Validator.prototype.hideMsgBox = function () {
    this.$msgBox.parentNode.style.display = 'none'
  }

  Validator.prototype.showMsgBox = function () {
    this.$msgBox.parentNode.style.display = ''
  }


  /*
   * add remove rules to the Validator Instance
   * */
  Validator.prototype.addRule = function (rule) {
    if ( isString(rule) && isUndef(this.rules[rule]) ) {
      this.rules[rule] = 1;
      sortRequiredFirst(this.rules);
    } else if ( isObject(rule) ) {
      this.rules = merge(this.rules, rule);
      sortRequiredFirst(this.rules);
    }
  }

  Validator.prototype.removeRule = function (rule) {
    if ( isString(rule)) {
      if(this.rules.hasOwnProperty(rule)) {
        delete this.rules[rule]
      }
    }
  }

  function removeDefine ($v, p) {
    Object.defineProperty($v, p, {
      get: function () {
        return void(0)
      }
    })
  }

  Validator.prototype.remove = function () {
    var id = this.id;
    _handlers[ id ].removers.forEach(function (fn) {
      fn();
    });

    // if observeAll is connected to this Validator it can occur an error
    // leave truthy as true to prevent it;
    _truthy[ id ] = true;

    delete _handlers[ id ];
    delete _errors[ id ];
    delete _reactiveObj[ id ];
    this.$msgBox.innerHTML = '';

    // remove link to properties defined by defineProperty
    [ 'pure', 'untouched', 'fail', 'success' ].forEach(
      function (p) {
        removeDefine(this, p)
      }, this
    )

    for ( var key in this ) {
      if ( this.hasOwnProperty(key) ) {
        delete this[ key ];
      }
    }
  }
  Validator.prototype.reset = function () {
    if ( isRadio(this.type) ) {
      this.$groups.forEach(function (v) {
        if ( v.checked ) {
          v.checked = false;
        }
      })
    } else if ( this.type === 'select' ) {
      var options = [].slice.call(this.$el.querySelectorAll('option'));
      if ( options.some(function (opt) {
          return opt.value === ''
        }) ) {
        this.$el.value = ''
      } else {
        this.$el.value = options[ 0 ].value;
      }
    } else if ( isCheckBox(this.type) ) {
      this.$el.checked = false;
    } else {
      this.$el.value = '';
    }
    this.dirty = false;
    this.touched = false;
    _getErrors.call(this)
  }

  function _validate (e) {
    var errors = _getErrors.call(this, e);
    //e is either event object or true sent from validateAll
    //errors can be tempered by dirty, validateAll needs real errors

    this.displayMsg(e === true? _errors[ this.id ] : errors);
    return _errors[ this.id ].length === 0;
  }

  function bufferFnReturn (a) {
    return isFunction(a) ? a() : a
  }

  function isRadio (str) {
    return str === 'radio'
  }
  function isCheckBox (str) {
    return str === 'checkbox'
  }
  //private methods
  function _getErrors () {

    // event object when it called from event and flag when it called by validateAll
    // get temp value from input;
    // radio and checkbox, if not defined value it returns 'on' select returns text of option selected;
    var value = ''

    //is radio we check which is checked and if one is checked switch $el with that element
    if ( isRadio(this.type) ) {
      var checked = this.$groups.filter(function (el) {
        return el.checked
      });
      value = checked.length ? checked[ 0 ].value : false;
      this.$el = checked[ 0 ] || this.$el;
    } else if (isCheckBox(this.type)){
      value = this.$el.checked;
    } else if (this.type === 'range'){
      //valueAsNumber supports ie 10 or above
      value = parseFloat(this.$el.value);
    } else {
      value = this.$el.value.trim();
    }

    _errors[ this.id ] = Object.keys(this.rules).filter(function (rule) {
      return !_vRule[ rule ].call(this, value, this.rules[ rule ])
    }, this).map(function (rule) {
      return [ rule, bufferFnReturn(getMsg(errMsg[ rule ], rule, this.rules[ rule ])) ];
    }, this);

    // uncount errors(except required) when value is '',
    // radio, checkbox, select irrelevant;
    if ( value === '' ) {
      _errors[ this.id ] = _errors[ this.id ].filter(function (err) {
        return err[ 0 ] === REQUIRED;
      }, this)
    }

    // validateAll or need errors even users' interaction haven't made yet
    if ( !this[ _config.waiver ] ) {
      return [];
    }
    return _errors[ this.id ];
  }

  function getMsg (msg, rule, param) {
    return isFunction(msg) ? msg(param) : (msg || _config.getDefaultMsg(rule));
  }

  var isValidating = false;
  // validation for multiple targets
  function validateAll () {
    if ( isValidating ) {
      return;
    }
    isValidating = true;
    var callback;
    var first;
    var args = slice.call(arguments).filter(function (obj) {
      if ( isValidatorObj(obj) ) {
        return true;
      } else if ( isFunction(obj) ) {
        callback = obj;
      }
      return false;
      // to show all the errors iterate all the obj
    }).map(function(obj){
      console.log(obj.validate(true));
      if ( !obj.validate(true) && !first ) {
        first = obj.$el;
        console.log('el',first)
      }
      return _errors[obj.id];
    })
    if ( !callback ) {
      consoleWarn('observeAll needs a callback function');
      return false;
    }
    console.log(first);
    Promise.resolve().then(function(){
      return callback(!first, args);
    }).then(function(){
      isValidating = false;
      first && first.focus();
    })
  }

  function resetAll () {
    slice.call(arguments).forEach(function (obj) {
      obj.reset();
    })
  }

  function observeAll () {
    var callback;
    var args = slice.call(arguments).filter(function (obj) {
      if ( isValidatorObj(obj) ) {
        return true;
      } else if ( isFunction(obj) ) {
        callback = obj;
      }
      return false;
    }).map(function (obj) {
      return obj.id
    })
    if ( !callback ) {
      consoleWarn('observeAll needs a callback function');
      return false;
    }
    args.forEach(function (id) {
      _reactiveObj[ id ].push(function () {
        var bool = args.map(function (b) {
          return _truthy[ b ]
        })
        callback(bool.indexOf(false) < 0, bool);
      })
    })
  }

  function isValidAll () {
    return slice.call(arguments).filter(function (obj) {
      if ( isValidatorObj(obj) ) {
        return true;
      }
      return false;
    }).every(function (obj) {
      return obj.truthy
    })
  }
  // constructor
  function Validator (elem, rules, ev, formatter, display, msgBox, extra) {

    // id
    var _id = this.id = id++;

    // element
    this.$el = elem;

    // type of input
    this.type = this.$el.tagName.toLowerCase() === 'input' ?
      (this.$el.getAttribute('type') || 'text') : this.$el.tagName.toLowerCase();

    //in case of radio you can't be tie to one element, you should check every radio element which has same name property
    if ( isRadio(this.type) ) {
      //only radio button has $groups property
      this.$groups = this.$el.name ? slice.call(document.querySelectorAll('[name=' + this.$el.name + ']')) : undefined;
      if ( !this.$groups ) {
        consoleWarn('your radio input needs name attribute.');
        return;
      }
    }

    var _formatter = isFunction(formatter) ? function () {
      changeValue(this, formatter(this.$el.value))
    } : noop;

    // any arguments passed by init, can be used in error checking function
    this.extra = extra;

    // focus event happened?
    this.touched = false;

    // change event happened?
    this.dirty = false;
    // where to display error message
    // if not provided, create and append div,
    // and in case of msgOff true skip it.
    msgBox = msgBox || getMsgBox(this.$el);
    msgBox.innerHTML = '<div class="' + _config.msg + '"></div>'
    this.$msgBox = msgBox.children[0];
    this.displayMsg = display || _config.display;
    this.hideMsgBox();

    //this.value = ''; don't use it yet
    // rules to apply
    this.rules = rules;

    // confirm reactive;
    var confirmTarget = rules.confirm;
    if (confirmTarget && isValidatorObj(confirmTarget)){
      ev = _validateEvent[confirmTarget.id]
      _handlers[confirmTarget.id].handlers[ev].push(this.validate.bind(this));
    }

    _reactiveObj[_id] = [];
    _validateEvent[_id] = ev;

    // errors => truthy => reactiveObj(*reference truthy)
    // most time errors truthy goes same path, but sometimes truthy can be interrupted by dirty or touched
    setReactive(_errors, _id, [], function (val) {
      _truthy[ _id ] = val.length ? false : true;
    })
    setReactive(_truthy, _id, false, function (val) {
      _reactiveObj[ _id ].forEach(function (fn) {
        fn()
      })
    });
    _getErrors.call(this); // in case only with value, validation needed

    var eventObj = _handlers[_id] = {};
    var eventHandlers = eventObj[ 'handlers' ] = {};
    var eventRemovers = eventObj[ 'removers' ] = [];

    eventHandlers.focus = [ markTouched ];

    // radio, checkbox, select and range don't need key event but text or similar inputs do
    if ( isNoKeyType(this.type) ) {
      eventHandlers.change = [ _validate ];
      eventHandlers.mousedown = formatterEvent(eventHandlers.mousedown, markDirty, _formatter)
    } else {

      eventHandlers[ ev ] = [ _validate ];
      eventHandlers.keyup = formatterEvent(eventHandlers.keyup, markDirty, _formatter)
    }

    // attach looping event to Element
    if ( this.$groups ) {
      for ( var evt in eventHandlers ) {

        eventRemovers = eventRemovers.concat(this.$groups.map(function (el) {
          return attachEventUtil(el, evt, loop.bind(this, evt))
        }, this))
      }
    } else {
      for ( var evt in eventHandlers ) {
        eventRemovers.push(attachEventUtil(this.$el, evt, loop.bind(this, evt)))
      }
    }
    return this;
  }

  function formatterEvent (handler, markDirty, formatter) {
    handler = handler || [];
    if ( formatter === noop ) {
      handler.unshift(markDirty);
    } else {
      handler.unshift(markDirty, formatter);
    }
    return handler;
  }

  function selectEl (elem) {
    if ( !elem ) {
      return void(0);
    }
    if ( isString(elem) ) {
      return document.querySelector(elem);
    } else if ( isString(elem.tagName) ) {
      return elem;
    } else {
      return void(0);
    }
  }

  //check whether target element is legit
  function initEl (elem) {
    elem = selectEl(elem);
    if ( elem ) {
      return [ 'input', 'select', 'textarea' ].some(function (v) {
        return v === elem.tagName.toLowerCase()
      }) ? elem : void(0)
    } else {
      return void(0);
    }
  }

  //check whether msg-box element is legit
  function initMsgBox (elem) {
    return selectEl(elem);
  }

  function initRules (arr) {
    if ( isString(arr) ) {
      return arr.length ? { [arr]: 1 } : {}
    } else if ( Array.isArray(arr) ) {
      return arr.reduce(function (p, r) {
        if ( isObject(r) ) {
          for ( var key in r ) {
            p[ key ] = r[ key ]
          }
        } else if ( isString(r) ) {
          p[ r ] = 1
        }
        return p;
      }, {});
    } else {
      return {};
    }
  }

  /*
   * return Validator Object
   * */
  function init (_elem, _option, ext) {
    if ( !(_elem && _option) ) {
      consoleWarn('check the arguments');
      return;
    }
    var elem = initEl(_elem);
    var rules = initRules(_option.rules);
    var msgBox = initMsgBox(_option.msgBox);
    var args = slice.call(arguments, 2);
    var evt = isString(_option.event) ? _option.event : _config.event;

    // elem is not provided
    if ( !elem ) {
      consoleWarn(`The element you provided is ${_elem} and it's not right format`);
      return;
    }

    // attribute required should be counted in
    if ( isString(elem.getAttribute(REQUIRED))) {
      rules[ REQUIRED ] = 1
    }

    if ( !Object.keys(rules).length ) {
      consoleWarn(`to validate rules should be defined, `);
      return;
    }

    rules = sortRequiredFirst(rules);


    var $v = new Validator(elem, rules, evt, _option.formatter, _option.display, msgBox, args);
    Object.defineProperties($v, {
      'pure': {
        get: function () {
          return !this.dirty
        },
        configurable: true,
        enumerable: true
      },
      'untouched': {
        get: function () {
          return !this.touched
        },
        configurable: true,
        enumerable: true
      },
      'fail': {
        get: function () {
          return !_truthy[ this.id ];
        },
        configurable: true,
        enumerable: true
      },
      'success': {
        get: function () {
          return _truthy[ this.id ];
        },
        configurable: true,
        enumerable: true
      }
    })
    return $v;
  }

  return {
    config: config,
    init: init,
    addRule: addRule,
    dictionary: dictionary,
    validateAll: validateAll,
    isValidAll: isValidAll,
    observeAll: observeAll,
    resetAll: resetAll
  }
})
