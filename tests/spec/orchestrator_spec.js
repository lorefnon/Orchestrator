describe('View extended with Orchestrator', function(){

    it('should ensure that view is constructed prior to rendering', function() {
        var tvar = 10;
        var View1 = Backbone.View.extend(Orchestrator).extend({
            construct: function(){
                tvar = 20;
                Orchestrator.construct.apply(this, arguments);
            }
        });
        v = new View1;
        v.model = new Backbone.Model({name: 'Lorefnon'});
        v.render();
        expect(tvar).toBe(20);
    });

    describe('with model bindings specified as selector-attribute pairs',
             function() {

                 var v = new (Backbone.View.extend(Orchestrator).extend({
                     viewBindings: {
                         '.name': 'name',
                         '.occupation': 'occupation'
                     },
                     autoBind: true
                 }));
                 v.model = new Backbone.Model({
                     name: 'Lorefnon',
                     occupation: 'ROR Developer'
                 });

                 beforeEach(function(){
                     v.el = document.getElementById('about');
                 });

                 it('should update the DOM upon initializations', function() {
                     v.render({autoBind: true});
                     expect($('#about .name').html()).toBe('Lorefnon');
                     expect($('#about .occupation').html())
                         .toBe('ROR Developer');
                 });

                 it('should update the DOM upon change in Model values',
                    function() {
                        v.model.set('name', 'Harry Potter');
                        expect($('#about .name').html()).toBe('Harry Potter');
                    });

                 it('should escape HTML content by default', function(){
                     v.model.set('occupation',
                                 '<script>alert("Avada Kedavara")</script>');
                     expect($('#about .occupation').html())
                         .toBe('&lt;script&gt;'+
                               'alert("Avada Kedavara")&lt;/script&gt;');
                 })
             });

    describe('with model bindings specified through simple configuration hash',
             function() {
                 var v = new (Backbone.View.extend(Orchestrator).extend({
                     autoBind: true,
                     viewBindings: {
                         'div.name': {
                             text: 'name',
                             attr: { 'data-name': 'name'},
                         },
                         'div.occupation' : { text: 'occupation' }
                     },
                 }));
                 v.model = new Backbone.Model({
                     name: 'Voldemort',
                     occupation: 'Dark wizard'
                 });
                 beforeEach(function(){
                     v.el = document.getElementById('about');
                 });

                 it('should update the DOM upon initialization', function() {
                     v.render();
                     expect($('#about .name').html()).toBe('Voldemort');
                     expect($('#about .name').attr('data-name'))
                         .toBe('Voldemort');
                     expect($('#about .occupation').html())
                         .toBe('Dark wizard');
                 });

                 it('should update the DOM upon change in Model values',
                    function() {
                        v.model.set('name', 'You Know Who');
                        expect($('#about .name').html()).toBe('You Know Who');
                        expect($('#about .name').attr('data-name'))
                            .toBe('You Know Who');
                    });
             });

    describe("with model bindings specified through functions", function(){
        var v = new (Backbone.View.extend(Orchestrator).extend({
            autoBind: true,
            viewBindings: {
                'div.name': {
                    'text': 'name',
                    'css' : {
                        fn: function(occupation){
                            if (occupation == 'Death Eater') {
                                return { 'font-weight': 900 }
                            } else {
                                return { 'font-weight': 100 }
                            }},
                        dependsOn: ['occupation']
                    }
                },
                '.occupation': 'occupation'
            }
        }));
        v.model = new Backbone.Model({
            name: 'Lucious Malfoy',
            occupation: 'Death Eater'
        });

        beforeEach(function(){
            v.el = document.getElementById('about');
        });

        it('should update the DOM upon first render', function() {
            v.render();
            $el = $('#about .name');
            expect($el.css('font-weight')).toBe('900');
            expect($el.html()).toBe('Lucious Malfoy');
            expect($('#about .occupation').html()).toBe('Death Eater');
        });
        it('should update the DOM upon change in Model values', function(){
            v.model.set('occupation','Wizard');
            expect($('#about .name').css('font-weight')).toBe('100');
        });
    });

    describe("with interactive bindings for entire forms with no configuration",
             function(){
                 var v = new (Backbone.View.extend(Orchestrator).extend({
                     interactiveBindings: ['#login_form'],
                     autoBind: true,
                     autoReverseBind: true
                 }));
                 v.model = new Backbone.Model();

                 beforeEach(function(){
                     v.el = document.getElementById('login_form_wrapper');
                 });

                 it('updates changes to model in form fields', function(){
                     v.render();
                     v.model.set('username', 'Lorefnon');
                     console.log(v);
                     expect(
                         $('#login_form input[name="username"]').attr('value'))
                         .toBe('Lorefnon')

                 });
                 it('syncs back the changes in the form fields ', function(){
                     $('#login_form input[name="username"]')
                         .attr('value', 'Sam')
                         .change();
                     expect(v.model.get('username')).toBe('Sam');
                 });
             });

    describe("with interactive bindings for forms with per-field custom"+
             " configuration", function(){
                 var v = new (Backbone.View.extend(Orchestrator).extend({
                     autoBind: true,
                     autoReverseBind: true,
                     interactiveBindings: {
                         '#login_form': {
                             fields: {
                                 'username' : {
                                     getFieldValue: function(attrValue){
                                         return attrValue.substr(1, attrValue.length -2);
                                     },
                                     getAttrValue: function(fieldValue){
                                         return "Y" + fieldValue + "X";
                                     }
                                 }
                             }
                         }
                     }
                 }));
                 v.model = new Backbone.Model;

                 beforeEach(function(){
                     v.el = document.getElementById('login_form_wrapper');
                 });

                 it("updates changes to model in form fields", function(){
                     v.render();
                     v.model.set('username', 'YGanimedeX');
                     expect($("input[name='username']").attr('value')).toBe("Ganimede");
                 });
                 it("syncs back the changes in the form fields", function(){
                     v.render();
                     $('#login_form input[name="username"]')
                         .attr('value', 'Sam')
                         .change();
                     expect(v.model.get('username')).toBe("YSamX");
                 });
             });
});
