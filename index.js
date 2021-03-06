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

  function throttle (callback, delay) {
    var lastRun = 0;
    var freeze = false;
    var lastTimeTobe;
    var setTimeTicking;

    function wrapper () {
      var $this = this;
      lastTimeTobe = Date.now();
      if ( freeze || ( lastTimeTobe - lastRun) < delay ) {
        return;
      }
      freeze = true;
      lastRun = lastTimeTobe;
      // if this is called before setTime is executed, remove it
      // since we will set setTime again;
      clearTimeout(setTimeTicking);
      var run = function () {
        callback.apply($this, arguments);
        freeze = false;
      }

      run();
      // check if there has been events called since the last execution;
      setTimeTicking = setTimeout(function () {
        if ( lastRun !== lastTimeTobe ) {
          freeze = true;
          run();
        }
      }, lastRun + delay - lastTimeTobe);

    }

    return wrapper
  }

  var _config = {
    boxClass: 'msg-box', //msg-box class, no padding, no
    msgClass: 'msg-box-msg', //msg-box
    errorClass: 'is-error',
    addClass: true,
    waiver: 'dirty',
    event: 'input',
    interval: 500,
    getDefaultMsg: function (rule) {
      return rule + ' : entered wrong'
    },
    display: function (errors) {
      var str = errors[ 0 ] ? errors[ 0 ][ 1 ] : ''
      this.showMessage(str);
    }
  }

  var _errMsg = {
    password: function (param) {
      return 'Password should include uppercase, lowercase, digit and the special character(@$!%*?&#+-_) with 8 to 12 letters.';
    },
    email: function (param) {
      return 'Not correct email format.';
    },
    confirm: function (param) {
      return 'password and confirming password are not identical.';
    },
    required: function (param) {
      return 'This field is required.';
    },
    numeric: function (param) {
      return 'It should be numbers only';
    },
    minLen: function (param) {
      return 'It should be more than ' + param + ' letters';
    },
    maxLen: function (param) {
      return 'It should be less than ' + param + ' letters';
    },
    minNum: function (param) {
      return 'Minimum should be ' + param;
    },
    maxNum: function (param) {
      return 'Maximum should be ' + param;
    }
  }

  var _vRule = {
    email: function (value) {
      return /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+\.(?:[a-zA-Z0-9-]+)$/.test(value);
    },
    required: function (value) {
      if ( isBoolean(value) ) {
        return value;
      } else {
        return String(value).trim().length;
      }
    },
    password: function (value) {
      return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_])[A-Za-z\d@$!%*?&#+\-_]{8,12}$/.test(value);
    },
    confirm: function (value, extra) {
      return value === extra.$el.value;
    },
    numeric: function (value) {
      return /^\d+$/.test(value);
    },
    minLen: function (value, minLen) {
      return value.toString().length >= minLen;
    },
    maxLen: function (value, maxLen) {
      return value.toString().length <= maxLen;
    },
    minNum: function (value, minNum) {
      return parseFloat(_refineValue.toIntStr(value)) >= minNum;
    },
    maxNum: function (value, maxNum) {
      return parseFloat(_refineValue.toIntStr(value)) <= maxNum;
    }
  };

  var _refineValue = {
    toIntStr: function (v) {
      return v.toString().replace(/\D/g, '') || 0;
    },
    toFloatStr: function (v) {
      return v.toString().replace(/(^0(?!\.)|[^\d.])/g, '').replace(/^(\d+\.\d*)(\.)$/, '$1') || 0;
    },
    toString: function (v) {
      return v.toString();
    }
  }

  var _id = 0;
  var _handlers = {};
  var _errors = {};
  var _truthy = {};
  var _values = {};
  var _observeObj = {};
  var _prevMessage = {}
  var _validateEvent = {};
  //faster than array.some method;
  var isOneOf = function (arr, value) {
    var is = false;
    var i
    for ( i = 0; i < arr.length; i++ ) {
      if ( arr[ i ] === value ) {
        is = true;
        break;
      }
    }
    return is;
  }

  function isNumber (n) {
    // n===n is for NaN
    return typeof n === 'number' && n === n;
  }

  function isUndef (un) {
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

  function isRadio (type) {
    return type === 'radio'
  }

  function isCheckBox (type) {
    return type === 'checkbox'
  }

  function isNumberInput (type) {
    return type === 'range' || type === 'number'
  }

  function attachEventUtil (elem, evt, fn) {
    elem.addEventListener(evt, fn, false);
    return elem.removeEventListener.bind(elem, evt, fn, false);
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

  function warn (msg) {
    console.warn(msg);
  }

  // prevent error of calling function when function is not prevented
  var noop = function () {
  };

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

  function sortRequiredFirst (rules) {
    return Object.keys(rules).sort(function (a, b) {
      return a === REQUIRED ? -1 : 0;
    }).reduce(function (p, c) {
      p[ c ] = rules[ c ];
      return p;
    }, {})
  }

  function formatterEvent (handler, markDirty, formatter) {
    handler = handler || [];
    if ( formatter ) {
      handler.unshift(markDirty, formatter);
    } else {
      handler.unshift(markDirty);
    }
    return handler;
  }

  // public method
  function config (c) {
    merge(_config, c);

    // if wrong value entered
    if ( _config.waiver !== 'dirty' && _config.waiver !== 'touched' ) {
      warn('The config value is not valid: waiver should be either dirty or touched. default(dirty) is applying')
      _config.waiver = 'dirty'
    }
    if ( !isNumber(_config.interval) ) {
      warn('The config value is not valid: interval should be number. default(500) is applying')
      _config.interval = 500;
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
        _errMsg[ name ] = msg;
      }
    }
  }

  // public method
  function dictionary (name, msg) {
    if ( !name ) {
      warn('dictionary needs its rule name');
      return false;
    }
    if ( isObject(name) ) {
      merge(_errMsg, name);
    } else if ( isString(name) && ( isFunction(msg) || isString(msg) ) ) {
      _errMsg[ name ] = msg;
    }
  }

  //msgBox
  function getMsgBox (el) {
    var msgbox = el.parentNode.querySelector('.' + _config.boxClass) || makeMsgBox(el);
    return msgbox;
  }

  function makeMsgBox (el) {
    var div = document.createElement('div');
    div.classList.add(_config.boxClass);
    el.parentNode.appendChild(div);
    return div;
  }

  // has a value that doesn't concern key events
  function isNoKeyType (v) {
    return isOneOf([ 'select', 'radio', 'checkbox', 'range' ], v)
  }

  function changeValue (self, value) {
    // no value returned from formatter or value doesn't concern key events;
    if ( !self || isUndef(value) ) {
      return;
    }
    if ( isRadio(self.type) ) {
      var checked;
      self.$groups.filter(function (v) {
        if ( v.value === value ) {
          v.checked = true;
          checked = v;
          return true;
        } else if ( v.checked ) {
          checked = v;
        }
        return false;
      }).length ? void(0) : checked.checked = false;

    } else if ( this.type === 'select' ) {
      var options = [].slice.call(self.$el.querySelectorAll('option'));
      if ( isOneOf(options, '') ) {
        self.$el.value = ''
      } else {
        self.$el.value = options[ 0 ].value;
      }
    } else if ( isCheckBox(self.type) ) {
      if ( value === 'true' || value === 'false' ) {
        value = Boolean(value)
      }
      self.$el.checked = !!value;
    } else {
      self.$el.value = value;
    }
  }

  function getValue (self) {
    var value
    if ( isRadio(self.type) ) {
      var checked = self.$groups.filter(function (el) {
        return el.checked
      });
      value = checked.length ? checked[ 0 ].value : false;
      self.$el = checked[ 0 ] || self.$el;
    } else if ( isCheckBox(self.type) ) {
      value = self.$el.checked;
    } else if ( isNumberInput(self.type) ) {
      // range and number return number value;
      value = parseFloat(self.$el.value);
    } else {
      value = self.$el.value;
    }
    return value;
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

  function removeDefine ($v, p) {
    Object.defineProperty($v, p, {
      get: function () {
        return void(0)
      }
    })
  }

  function _validate (e) {
    var errors = _getErrors.call(this, e);
    //e is either event object or true sent from validateAll
    //errors can be tempered by dirty, validateAll needs not tempered one
    this.displayMsg(e === true ? _errors[ this.id ] : errors);
    return _errors[ this.id ].length === 0;
  }

  // private methods
  function _getErrors () {

    // event object when it called from event and flag when it called by validateAll
    // get temp value from input;
    // radio and checkbox, if not defined value it returns 'on' select returns text of option selected;
    var value = _values[ this.id ] = this.refineValue(getValue(this));
    //is radio we check which is checked and if one is checked switch $el with that element

    _errors[ this.id ] = Object.keys(this.rules).filter(function (rule) {
      return _vRule[ rule ] && !_vRule[ rule ](value, this.rules[ rule ])
    }, this).map(function (rule) {
      return [ rule, bufferFnReturn(getMsg(_errMsg[ rule ], rule, this.rules[ rule ])) ];
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

  function bufferFnReturn (a) {
    return isFunction(a) ? a() : a
  }

  // **constructor
  function Validator (elem, rules, ev, formatter, refineValue, display, msgBox, extra) {

    // id
    var id = this.id = ++_id;

    // element
    this.$el = elem;

    // type of input
    this.type = this.$el.tagName.toLowerCase() === 'input' ?
      (this.$el.getAttribute('type') || 'text') : this.$el.tagName.toLowerCase();
    if ( isOneOf([ 'image', 'button', 'reset', 'submit' ], this.type) ) {
      warn('Validator doesn\'t support this type of form fileld.')
      return;
    }
    //in case of radio you can't be tie to one element, you should check every radio element which has same name property
    if ( isRadio(this.type) ) {
      //only radio button has $groups property
      this.$groups = this.$el.name ? slice.call(document.querySelectorAll('[name=' + this.$el.name + ']')) : undefined;
      if ( !this.$groups ) {
        warn('your radio input needs name attribute.');
        return;
      }
    }

    var _formatter = isFunction(formatter) ? function () {
      changeValue(this, formatter(getValue(this)))
    } : null;

    this.refineValue = isFunction(refineValue) ? refineValue : function (value) {
      return value
    };
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
    msgBox.innerHTML = '<div class="' + _config.msgClass + '"></div>'
    this.$msgBox = msgBox.children[ 0 ];
    this.displayMsg = display || _config.display;
    this.hideMsgBox();

    //this.value = ''; don't use it yet
    // rules to apply
    this.rules = rules;
    _values[ id ] = '';
    // confirm reactive;
    var confirmTarget = rules.confirm;
    if ( confirmTarget && isValidatorObj(confirmTarget) ) {
      ev = _validateEvent[ confirmTarget.id ]
      _handlers[ confirmTarget.id ].handlers[ ev ].push(this.validate.bind(this));
    }

    _observeObj[ id ] = [];
    _validateEvent[ id ] = ev;

    // errors => truthy => reactiveObj(*reference truthy)
    // most time errors truthy goes same path, but sometimes truthy can be interrupted by dirty or touched
    setReactive(_errors, id, [], function (val) {
      _truthy[ id ] = val.length ? false : true;
    })
    setReactive(_truthy, id, false, function (val) {
      _observeObj[ id ].forEach(function (fn) {
        fn()
      })
    });
    _getErrors.call(this); // pure can be submitted. error check needed to init

    var eventObj = _handlers[ id ] = {};
    var eventHandlers = eventObj[ 'handlers' ] = {};
    var eventRemovers = eventObj[ 'removers' ] = [];

    eventHandlers.focus = [ markTouched ];

    // radio, checkbox, select and range don't need key event but text or similar inputs do
    if ( isNoKeyType(this.type) ) {
      eventHandlers.change = [ throttle(_validate, _config.interval) ];
      eventHandlers.mousedown = formatterEvent(eventHandlers.mousedown, markDirty)
    } else {
      eventHandlers[ ev ] = [ throttle(_validate, _config.interval) ];
      eventHandlers.input = formatterEvent(eventHandlers.input, markDirty, _formatter)
    }

    // attach looping event to Element
    if ( this.$groups ) {
      for ( var evt in eventHandlers ) {
        eventObj[ 'removers' ] = eventObj[ 'removers' ].concat(this.$groups.map(function (el) {
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

  Validator.prototype.validate = _validate;

  // message box: hideMsgBox, showMsgBox, showMessage
  Validator.prototype.hideMsgBox = function () {
    this.$msgBox.parentNode.style.display = 'none'
  }

  Validator.prototype.showMsgBox = function () {
    this.$msgBox.parentNode.style.display = ''
  }

  Validator.prototype.showMessage = function (str) {
    if ( _prevMessage[ this.id ] === str ) {
      return;
    }
    if ( !str ) {
      _config.errorClass && this.$el.classList.remove(_config.errorClass);
      this.hideMsgBox();
    } else {
      _config.errorClass && this.$el.classList.add(_config.errorClass);
      this.$msgBox.innerHTML = str;
      this.showMsgBox();
    }
    _prevMessage[ this.id ] = str;
  }

  Validator.prototype.getValue = function () {
    return _values[ this.id ];
  }
  // rules
  Validator.prototype.addRule = function (rule) {
    if ( isString(rule) && isUndef(this.rules[ rule ]) ) {
      this.rules[ rule ] = 1;
      sortRequiredFirst(this.rules);
    } else if ( isObject(rule) ) {
      this.rules = merge(this.rules, rule);
      sortRequiredFirst(this.rules);
    }
  }
  // user purposely remove all the rules, it's their choice, don't block it
  Validator.prototype.removeRule = function (rule) {
    if ( isString(rule) ) {
      if ( this.rules.hasOwnProperty(rule) ) {
        delete this.rules[ rule ]
      }
    }
  }

  Validator.prototype.remove = function () {
    var id = this.id;
    _handlers[ id ].removers.forEach(function (fn) {
      fn();
    });

    // if observeAll is connected to this Validator it can occur an error
    // leave truthy as true to prevent it;
    delete _truthy[ id ];
    delete _handlers[ id ];
    delete _errors[ id ];
    delete _observeObj[ id ];
    delete _values[ id ];
    var sub = Object.keys(_subscribe);
    for ( var i = 0; i < sub.length; i++ ) {
      _subscribe[ sub[ i ] ].targets = _subscribe[ sub[ i ] ].targets.filter(function (v) {
        return v !== this
      }, this)
    }
    this.hideMsgBox();

    for ( var key in this ) {
      if ( this.hasOwnProperty(key) ) {
        delete this[ key ];
      }
    }
  }
  //errorsToShow : regardless
  Validator.prototype.setValue = function (value, errorsToShow) {
    changeValue(this, value);
    this.validate(errorsToShow);
  }
  Validator.prototype.reset = function () {
    changeValue(this, '');
    this.dirty = false;
    this.touched = false;
    this.validate();
  }
  // validation for multiple targets
  function validateAll () {
    var args = slice.call(arguments);
    var a = args.filter(function (obj) {
      if ( isValidatorObj(obj) && !obj.validate(true) ) {
        return true;
      }
      return false;
    })
    return a.length === 0 ? { fail: false, success: true, fields: args }
      : { fail: true, success: false, fields: args, failedFields: a };
  }

  function resetAll () {
    slice.call(arguments).forEach(function (obj) {
      // if element has been removed or validator.removed has been called;
      if ( obj.$el ) {
        obj.reset();
      }
    })
  }

  var _subscribe = {}

  function observeAll () {
    var callback;
    var id = ++_id;
    var args = slice.call(arguments).filter(function (obj) {
      if ( isValidatorObj(obj) ) {
        return true;
      } else if ( isFunction(obj) ) {
        callback = obj;
      }
      return false;
    })
    if ( !callback ) {
      warn('observeAll needs a callback function');
      return false;
    }
    _subscribe[ id ] = {
      fn: function () {
        var $this = _subscribe[ id ];
        if ( $this.targets ) {
          var bool = $this.targets.some(function (_obj) {
            return !_obj.valid;
          })
          callback.apply(null, [ !bool ].concat($this.targets));
        }
      },
      targets: args,
    }
    args.forEach(function (obj) {
      _observeObj[ obj.id ].push(_subscribe[ id ].fn)
    })
    return id;
  }

  function removeObserver (id) {
    _subscribe[ id ].targets.forEach(function (obj) {
      _observeObj[ obj.id ] = _observeObj[ obj.id ].filter(function (v) {
        return v !== _subscribe[ id ].fn
      })
    })
    delete _subscribe[ id ];
  }

  function isValidAll () {
    return slice.call(arguments).filter(function (obj) {
      if ( isValidatorObj(obj) ) {
        return true;
      }
      return false;
    }).every(function (obj) {
      return obj.valid
    })
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
      return isOneOf([ 'input', 'select', 'textarea' ], elem.tagName.toLowerCase()) ? elem : void(0);
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

  Object.defineProperties(Validator.prototype, {
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
    'failed': {
      get: function () {
        return !_truthy[ this.id ];
      },
      configurable: true,
      enumerable: true
    },
    'valid': {
      get: function () {
        return _truthy[ this.id ];
      },
      configurable: true,
      enumerable: true
    }
  })

  // return Validator Object
  function init (_elem, _option, ext) {
    if ( !(_elem && _option) ) {
      warn('check the arguments');
      return;
    }
    var elem = initEl(_elem);
    var rules = initRules(_option.rules);
    var msgBox = initMsgBox(_option.msgBox);
    var args = slice.call(arguments, 2);
    var evt = isString(_option.event) ? _option.event : _config.event;

    // elem is not provided
    if ( !elem ) {
      warn(`The element you provided is ${_elem} and it's not right format`);
      return;
    }

    // attribute required should be counted in
    if ( isString(elem.getAttribute(REQUIRED)) ) {
      rules[ REQUIRED ] = 1
    }

    if ( !Object.keys(rules).length ) {
      warn(`to validate rules should be defined, `);
      return;
    }

    rules = sortRequiredFirst(rules);
    return new Validator(elem, rules, evt, _option.formatter, _option.refineValue, _option.display, msgBox, args);
  }

  return {
    config: config,
    init: init,
    addRule: addRule,
    dictionary: dictionary,
    validateAll: validateAll,
    isValidAll: isValidAll,
    observeAll: observeAll,
    resetAll: resetAll,
    removeObserver: removeObserver
  }
})
