var dir = require('tools').dir;
var getClass = require('tools').getClass;

var TNode = require('tree');

var self = require("self")

var tabs = require('sdk/tabs');
var windows = require('sdk/windows');
var widgets = require("sdk/widget");

var events = require("sdk/system/events");

var winutils = require('sdk/window/utils');
var tabutils = require('sdk/tabs/utils');

var TabsOutlinerPane = function (tree) {
    this.tree = tree;
    this.pane = undefined;
    var that = this;

    this.open = function() {
        console.log("open TOPane");
        this.pane = winutils.open(self.data.url("panel.html"),
                                        { name: "Tab Outliner",
                                            features: {
                                                left: 0,
                                                top: 0,
                                                width: 200,
                                                height: 600,
                                                menubar: false,
                                                resizable: true,
                                                toolbar: false,
                                                location: false,
                                                personalbar: false,
                                                status: false,
                                                scrollbars: false,
                                                dialog: true
                                            }});
    }

    this.isActive = function() {
        if (this.pane === undefined) { console.log("Pane not activated"); return false; }
        if (this.pane.document === undefined) { console.log("Pane has no document"); return false; }
        return true;
    }

    this.reset = function() {
        console.log("resetting TOPane");
        if (! this.isActive())
            return false;
        var domTree = this.pane.document.getElementById('tabTree');
        if (! domTree)
            return false;
        while (domTree.hasChildNodes() ) {
            domTree.removeChild(domTree.firstChild);
        }
        return true;
    }

    this.update = function() {
        console.log ("TabsOutlinerPane.update");
        if (!this.reset())
            return false;

        var walk = function (tree, domRoot) {
            if (tree.content === null) 
                tree.content = "root";

            // for each child of current node
            for (var node in tree.children) {
                node = tree.children[node];
                var liElt = that.pane.document.createElement("li");
                if (node.children.length == 0) {
                    var liClass = []
                    if (node.content === tabutils.getActiveTab(tabutils.getOwnerWindow(node.content)))
                        liClass.push( 'active' );
                    if (tree.children.indexOf(node) == tree.children.length-1)
                        liClass.push( "last" );
                    liElt.className = liClass.join(" ");
                    if (! node.content.image)
                        liElt.innerHTML = "<span><img class='favicon' src='chrome://mozapps/skin/places/defaultFavicon.png' />"+tabutils.getTabTitle(node.content)+"</span>";
                    else
                        liElt.innerHTML = "<span><img class='favicon' src='"+ node.content.image +"' />"+tabutils.getTabTitle(node.content)+"</span>";
                } else {
                    var liClass = "";
                    if (node.content === winutils.getMostRecentBrowserWindow())
                        liClass = ' active';
                    if (tree.children.indexOf(node) == tree.children.length-1) {
                        var icon = node.content.image ? node.content.image : self.data.url("images/firefox-small.png");
                        liElt.className = "collapsable lastCollapsable" + liClass;
                        liElt.innerHTML = "<div class='last hitarea collapsable-hitarea lastCollapsable-hitarea'></div><span><img class='favicon' src='"+ icon +"' />"+getClass(node.content)+"</span>"; 
                    } else {
                        var icon = node.content.image ? node.content.image : self.data.url("images/firefox-small.png");
                        liElt.className = "collapsable" + liClass;
                        liElt.innerHTML = "<div class='hitarea collapsable-hitarea'></div><span><img class='favicon' src='"+ icon +"' />"+getClass(node.content)+"</span>"; 
                    }
                    var ulElt = that.pane.document.createElement("ul");
                    walk(node, ulElt);
                    liElt.appendChild(ulElt);
                }
                domRoot.appendChild(liElt);
            }
        }
        var domTree = this.pane.document.getElementById('tabTree');
        walk (this.tree, domTree);
    }

}

var EventHandler = function (topane) {
    console.log("EventHandler()");

    var that = this;
    this.update = function (ev) {
        if (ev === undefined)
            console.log("EventHandler.update()");
        else
            console.log("EventHandler.update("+ev.type+","+ev.subject+","+ev.data+")");
        topane.tree.clear();
        winutils.windows().forEach(
            function(win, idx, l) {
                if (winutils.isBrowser(win)) {
                    if (!(this.tree.has(win))) {
                        this.tree.add(win);
                        tabutils.getTabs(win).forEach(
                            function(tab, idx, l) {
                                if (!this.tree.get(win).has(tab))
                                    this.tree.get(win).add(tab);
                            }, topane
                        );
                    }
                }
            }, topane
        );
        topane.update();
    }   

    var widget = widgets.Widget({
        id: "tabs-outliner-link",
        label: "Tabs Outliner for Firefox",
        contentURL: self.data.url("images/favicon.ico"),
        onClick: function() {
            if (topane.pane === undefined) {
                topane.open();
                that.update();
            } else {
                topane.tree.print();
            }
        }
    });

    events.on('chrome-document-global-created', this.update );
    events.on('xul-window-registered', this.update );
    events.on('xul-window-visible', this.update );
    events.on('xul-window-destroyed', this.update );
    events.on('http-on-modify-request', this.update );

    let observer = require("sdk/tabs/observer").observer;

    observer.on("open", function() { console.log("tabs/open"); that.update({}) });
    observer.on("close", function() { console.log("tabs/close"); that.update({}) });
    observer.on("move", function() { console.log("tabs/move"); that.update({}) });
    observer.on("select", function() { console.log("tabs/select"); that.update({}) });
    
};

start = function() {
    new EventHandler( new TabsOutlinerPane(new TNode(null)) );
}
 
start();

