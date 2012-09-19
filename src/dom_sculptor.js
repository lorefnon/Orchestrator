var Sculptor = {
    construct: function(){
        this.isConstructed = true;
        this.trigger("sculptor:construct-complete");
        return true;
    },
    _firstRender: function() {
        var _this = this;
        var mb = _this._metaBindings = {};

        function trackBinding(trackPath, attrs, fn, $el) {
            _.each(attrs, function(attr){
                mb[attr] = mb[attr] || {};
                var attrConfig = mb[attr];
                var selector = trackPath[0];
                var selectorConfig = attrConfig[selector] 
                    = attrConfig[selector] || {};
                var param = trackPath[1];
                
                if (trackPath.length == 2) {
                    selectorConfig[param] = fn;
                } else {
                    var paramConfig = selectorConfig[param] 
                        = selectorConfig[param] || {};
                    paramConfig[trackPath[2]] = fn;
                }
            });
        }

        function isBindingConfig(config) {
            return _.isObject(config) &&
                _.isFunction(config.fn) &&
                _.isArray(config.dependsOn);
        }

        if (this.dataBindings) {
            _.each(this.dataBindings, function(binding, selector) {
                var $el = binding['preventCaching'] ? null : $(selector);  
                _.each(['html', 'text', 'css', 'attrs'], function(binding, param){
                    var trackPath = [selector, param];
                    if (_.isString(config)) {
                        trackBinding(trackPath, [config], null, $el);
                    } else if (isBindingConfig(config)) {
                        trackBinding([param], config.dependsOn, config.fn, $el);
                    } else if (_.isObject(config)) {
                        _.each(config, function(val, key){
                            if (isBindingConfig(val)) {
                                trackPath = trackPath.concat([key]);
                                trackBinding(trackPath, val.dependsOn, val.fn, $el);    
                            }
                        });
                    }
                });
            });
        }

        this._populateView({all: true});
        this.isRendered = true;
        this.trigger("sculptor:render-complete");
        return true;
    },
    _populateView: function(config) {
        var attrs;
        var mb = this._metaBindings;
        if (config && config.all) {
            attrs = this.model.attributes;
        } else {
            attrs = this.changedAttributes();
        }
        _.each(attrs, function(val, attr){
            if (! mb[attr]) {
                return;
            }
            _.each(mb[attr], function(selectorConfig, selector) {
                $el = selectorConfig.$el || $(selector);
                _.each(selectorConfig, function(paramConfig, param) {
                    if (_.isNull(paramConfig)) {
                        $el[param](val);
                    } else if (_.isFunction(paramConfig)) {
                        $el[param]([paramConfig(val)])
                    } else if (_.isObject(paramConfig)) {
                        var options = {};
                        _.each(paramConfig, function(optionConfig,option){
                            if (_.isNull(optionConfig)) {
                                options[option] = val;
                            } else if (_.isisFunction(optionConfig)) {
                                options[option] = optionConfig(val);
                            }
                        });
                        $el[param](options);
                    }
                })
            })
        })
    },
    _fullReRender: function() {
        return true;
    },
    render: function(config) {
        var _this = this;
        config = config || {};
        if (this.isRendered) {
            return true;
        }
        if (! this.isConstructed) {
            if (config.preventConstruction) {
                return false;
            } else {
                var fn = function(){
                    _this.off("sculptor:construct-complete", fn);
                    _this.render();
                }
                this.on("sculptor:construct-complete", fn);
                this.construct();
                return false;
            }
        }
        if (! this.isRendered) {
            return this._firstRender();
        } else if (config.fullReRender) {
            return this._populateView({all: true});
        } else if (this.model && this.model.hasChanged()) {
            return this._populateView();
        }
        if (config.autoBind) {
            _.each(_.keys(this.metaBindings), function(key) {
                _this.model.on('change:'+key, function(){
                    _this.populateView();
                });
            });
        }
        return true;
    }
}