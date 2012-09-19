describe("dom_sculptor", function(){
    it("should ensure that view is constructed before it is rendered", function(){
        var tvar = 10;
        var View1 = Backbone.View.extend(Sculptor).extend({
            construct: function(){
                tvar = 20;
                Sculptor.construct.apply(this, arguments);
            }
        });
        v = new View1;
        v.model = new Backbone.Model({name: "Lorefnon"});
        v.render();
        expect(tvar).toBe(20);
        
    });
});