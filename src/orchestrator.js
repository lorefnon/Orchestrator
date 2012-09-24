// **Orchestrator** is an extension for Backbone.View that augments a View with
// powerful and flexible data-binding facilities.
//
// Orchestrator's primary goal is to provide an easy-to-use data-binding
// facility for Backbone which could be configured entirely through javascript
// inside the View class without resorting to custom attributes
// or special tags in templates.
//
// The objective is to provide a configuration system which can be succinct
// enough to take care of most common data-binding requirements in very few
// lines of code verbose enough to take care of complex binding requirements if
// need arises.
//
// Configurability is primary objective (over reduction of lines of code) so
// that non-trivial data-binding requirements can be taken care of in a
// methodical fashion.
//
// _Everything is fairly transparent with no sorcery involved. No claim
// regarding dramatic reduction of size of codebase is being made._
var Orchestrator = {

    // Construct the internal structure of the DOM element for this view.
    // Orchestrator ensures that before render can bind the DOM, construct
    // has run successfully.
    construct: function(){
        // Default implementation does not do much - leave it as it is if
        // required DOM structure is already present.

        // Mark the view as constructed.
        this.isConstructed = true;

        // Notify about completion of construction. Allows for
        // asynchronous construction.
        this.trigger("sculptor:construct-complete");
    },
    _firstRender: function(config) {
        var _this = this;
        var mb = _this._metaViewBindings = {};

        // Setup internal configuration for attribute tracking :
        function trackBinding(trackPath, attrs, fn, $el) {

            // Iterate over model attributes to be tracked:
            _.each(attrs, function(attr){
                var attrConfig = mb[attr] = mb[attr] || {};
                var selector = trackPath[0];
                var selectorConfig = attrConfig[selector]
                    = attrConfig[selector] || {};
                var param = trackPath[1];

                if (trackPath.length == 2) {

                    // No nested configuration :
                    selectorConfig[param] = fn;

                } else {

                    // For css, attr which have nested configuration :
                    var paramConfig = selectorConfig[param]
                        = selectorConfig[param] || {};
                    paramConfig[trackPath[2]] = fn;

                }
            });
        }

        // Check if object is a configuration object for
        // specifying custom binding rules.
        function isBindingConfig(config) {
            return _.isObject(config) &&
                _.isFunction(config.fn) &&
                _.isArray(config.dependsOn);
        }

        // Analyse two-way bindings :
        if (this.interactiveBindings) {
            var ib = this.interactiveBindings;
            if (_.isArray(ib)) {
                _.each(ib, function(selector) {
                    _this._bindInteractive(selector);
                });
            } else if (_.isObject(ib)) {
                _.each(ib, function(config, selector) {
                    _this._bindInteractive(selector, config);
                });
            }
        }

        // Analyse one-way binding specifications
        if (this.viewBindings) {
            _.each(this.viewBindings, function(binding, selector) {

                // Keep a reference to wrapped DOM node unless
                // caching of DOM node is explicitly forbidden - use if
                // DOM is manipulated at after rendering. In that case
                // selector will be used to select matching node for every
                // render.
                var $el = binding['preventCaching'] ? null :
                    $(_this.el).find(selector);

                // Shorthand syntax to bind text content:
                if (_.isString(binding)) {
                    binding = { text: binding }
                }

                // Check all bindables :
                _.each(['html', 'text', 'css', 'attr'], function(param){
                    var trackPath = [selector, param];

                    // Get the binding configuration :
                    var config = binding[param];

                    if (! config) {

                        // No binding configuration exists
                        return;

                    } else if (_.isString(config)) {

                        // Simply bind the attribute value
                        trackBinding(trackPath, [config], null, $el);

                    } else if (isBindingConfig(config)) {

                        // Utilize provided custom binding function.
                        trackBinding(trackPath, config.dependsOn,
                                     config.fn, $el);

                    } else if (_.isObject(config)) {

                        // Nested binding specification - binding for specific
                        // CSS rules or DOM attributes.
                        _.each(config, function(val, key) {
                            var tpath = trackPath.concat([key]);
                            if (isBindingConfig(val)) {
                                trackBinding(tpath, val.dependsOn, val.fn, $el);
                            } else if (_.isString(val)) {
                                trackBinding(tpath, [val], null, $el);
                            }
                        });
                    }
                });
            });
        }


        // Automatically update the DOM upon every model change.
        // If autoBind is not specified DOM is not updated untill explicitly
        // render is called.
        if (this.autoBind) {
            this._bindToModel();
        }

        this._populateView({all: true});
        this.isRendered = true;
        this.trigger("sculptor:render-complete");
        return true;
    },

    // Setup two way binding for form elements :
    _bindInteractive: function(selector, config) {
        config = config || {};
        $el = $(this.el).find(selector);
        if ($el.length == 0) {
            return;
        }
        if ($el.get(0).tagName.toLowerCase() == 'form') {
            this._bindForm($el, config);
        } else {
            this._bindField($el, config);
        }
    },

    _normalizeConfig: function($el, config) {
        if (! config.fields) {

            // No per-field configuration available - setup
            // defacto configuration from the names of the
            // input fields of form

            config.fields = {};

            // iterate over all the input elements of the form
            $el.find(':input').each(function(idx, el) {
                var $el = $(el);
                name = $el.attr('name');
                if (! name) return;
                config.fields[name] = { '$el': $el }
            });
        }

        if (_.isArray(config.fields)) {
            _.each(config.fields, function(name) {
                var $fieldEl = $el.find('[name = "'+name+'"]');
                if ($fieldEl.length > 0) {
                    fields[name] = { $el: $fieldEl }
                }
            });
            config.fields = fields;
        } else if (_.isObject(config.fields)) {
            _.each(config.fields, function(fieldConfig, name) {
                var $fieldEl = $el.find('[name = "'+ name +'"]');
                if ($fieldEl.length == 0) {
                    delete config.fields[name];
                    return;
                }
                config.fields[name].$el = $fieldEl;
            });
        }
        return config;
    },

    // Setup binding for an entire form
    _bindForm: function($el, config) {
        config = config || {};
        var _this = this;
        dFieldConfig = config.defaultFieldConfig || {}
        config = this._normalizeConfig($el, config);
        _.each(config.fields, function(fieldConfig, name) {
            _this._bindField(fieldConfig.$el,
                             _.extend({}, dFieldConfig, fieldConfig));
        });
    },

    // Setup binding for a single form field
    _bindField: function($el, config) {
        config = config || {};
        var name = $el.attr('name') || $el.attr('id');
        if (! name) return;
        config.$el = $el;
        var attrName = config.attrName = config.attrName || name;
        this._metaIFields = this._metaIFields || {};
        this._metaIFields[name] = config
        var _this = this;
        if (this.autoReverseBind) {
            $el.on('change', function() {

                // Update the model immediately after the value
                // of an input field has changed.
                var attrValue, fieldValue = $el.attr('value');
                if (_.isFunction(config.getAttrValue)) {
                    attrValue = config.getAttrValue(fieldValue);
                } else {
                    attrValue = fieldValue;
                }
                _this.model.set(attrName, attrValue);
            });
        } else {
            $el.on('change', function() {

                // When the value of some input field has
                // changed - register the change in internal
                // configuration but do not update the model
                _this._metaIFields[name].changed = true;
            });
        }
        if (this.autoBind) {

            // Update the user-interface when model changes
            this.model.on('change:'+attrName, function() {
                _this._updateField(config);
            });
        }

        var mb = this._metaViewBindings;
        mb[attrName] = mb[attrName] || {};
        var selector = "[name='"+ name +"']"
        var fn = null;
        if (config.getFieldValue) {
            fn = config.getFieldValue
        }
        mb[selector] = {
            $el: $el,
            attr: { value : fn }
        }
    },

    _updateField: function(config) {
        var fieldValue;
        var attrName = config.attrName = config.attrName || name;
        if (_.isFunction(config.getFieldValue)) {

            // Derive the field-value from a custom
            // translator function specified in
            // configuration
            fieldValue = config.getFieldValue(
                this.model.get(attrName)
            );
        } else {

            // use the attribute value as field-value
            fieldValue = this.model.get(attrName)
        }
        config.$el.attr('value', fieldValue);
    },

    // Sync the model to view
    sync: function(){
        var _this = this;
        _.each(this._metaIFields, function(fieldConfig) {
            if (! fieldConfig.changed) {
                return;
            }
            var attrValue, fieldValue;
            fieldValue = fieldConfig.$el.attr('value');
            if (_.isFunction(fieldConfig.getAttrValue)) {
                attrValue = fieldConfig.getAttrValue(fieldValue);
            } else {
                attrValue = fieldValue;
            }
            _this.model.set(fieldConfig.attrName, attrValue);
        });
    },

    // Populate the view with data from the Model :
    // To keep this efficient only the model that has been
    // changed is recomputed.
    _populateView: function(config) {
        var attrs;
        var _this = this;
        var mb = this._metaViewBindings;
        var mi = this._metaIFields;

        // Check for an explicit instruction to render
        // all attributes
        if (config && config.all) {
            attrs = this.model.attributes;
        } else {
            attrs = this.model.changedAttributes();
        }

        _.each(attrs, function(val, attr){

            if (! mb[attr]) {
                return;
            }

            // Iterate over bound elements :
            _.each(mb[attr], function(selectorConfig, selector) {
                $el = selectorConfig.$el || $(_this.el).find(selector);

                // Iterate over bounded parameters :
                _.each(selectorConfig, function(paramConfig, param) {
                    if (_.isNull(paramConfig)) {

                        // By default use the model attribute value
                        $el[param](val);

                    } else if (_.isFunction(paramConfig)) {

                        // Pass the attribute value through custom
                        // formatter
                        $el[param](paramConfig(val));

                    } else if (_.isObject(paramConfig)) {
                        var options = {};

                        // For nested parameters eg. css, attr:
                        _.each(paramConfig, function(optionConfig,option){
                            if (_.isNull(optionConfig)) {
                                options[option] = val;
                            } else if (_.isFunction(optionConfig)) {
                                options[option] = optionConfig(val);
                            }
                        });
                        $el[param](options);
                    }
                });
            });
        });
    },

    _bindToModel: function() {
        var _this = this;
        _.each(_.keys(_this._metaViewBindings), function(key) {
            _this.model.on('change:'+key, function(){
                _this._populateView();
            });
        });
    },

    // Render the view : update the DOM as per changed model attributes.
    render: function(config) {
        var _this = this;
        config = config || {};

        // Has the DOM for the view element been set up ?
        if (! this.isConstructed) {

            // Check if auto-construction is explicitly forbidden
            if (config.preventConstruction) {
                return false;
            } else {
                var fn = function(){
                    _this.off("sculptor:construct-complete", fn);
                    _this.render();
                }

                // Render the view once construction is complete
                this.on("sculptor:construct-complete", fn);
                this.construct();
                return false;
            }
        }

        // Has the view already been redered?
        if (! this.isRendered) {

            // Set up all the required event handlers
            return this._firstRender(config);
        } else if (config.fullReRender) {

            // Rerender all the attributes irrespective of
            // whether they have changed or not
            return this._populateView({all: true});
        } else if (this.model && this.model.hasChanged()) {

            // Render only changed attributes
            return this._populateView();
        }
        return true;
    }
}