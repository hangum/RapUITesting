/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2006-2007 1&1 Internet AG, Germany, http://www.1and1.org

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Robert Zimmermann (rz)
     * Thomas Herchenroeder (thron7)

************************************************************************ */

/**
 * Selenium Extension for testing Applications build with qooxdoo
 *   see http://qooxdoo.org
 *
 * This extension covers the following commands to test applications build with qooxdoo:
 *  1.) special click commands: "qxClick" and "qxClickAt"
 *  2.) special qooxdoo element-locator "qx=" and "qxp="
 *
 * Supported Browsers:
 *  - Mozilla-Family
 *  - Internet Explorer
 *
 * qxClick and qxClickAt:
 *  Both commands fire "mousedown" followed by "mouseup", as qooxdoo mostly does
 *  not listen for "click".  Additionally these commands provide the possibility
 *  to customize mouse-events, to do eg. a right-click or
 *  click-with-shift-key-pressed, see below for details.
 * Example:
 * +----------+-----------------+------------------------------+
 * |qxClick   | <any locator>   | button=right, shiftKey=true  |
 * +----------+-----------------+------------------------------+
 *
 * qxClickAt also computes the X- and Y- coordinates of the target element.
 *
 * mouse-event-details (qxClick values):
 *  button: the mouse-button to be pressed
 *   - possible values: left, right, middle
 *   - default value  : left
 *  clientX and clientY: coordinates where the click is donne
 *   - possible values: any positive integer
 *   - default value  : 0
 *  shiftKey, altKey, metaKey: additional modifier keys beeing pressed during click
 *   - possible values: true, false
 *   - default value  : false
 *
 *
 * Special qooxdoo Locator:
 *  As qooxdoo HTML consists mainly of div-elements, it is mostly difficult to
 *  locate an distinct element with xpath (sometimes impossible).  If You have
 *  access to the source of the AUT build with qooxdoo You can supply UserData
 *  for the elements to interact with.
 *  "qxp=": Additional, combined Locator like qxp=myDialog/buttonOK//XPATH-descendant
 *
 * Example:
 *  customButton = new qx.ui.menu.MenuButton("Click Me", ...);
 *  customButton.setUserData("customButton", "place here anything You want, e.g. selenium");
 * Now this qooxdoo-button can be located (and clicked) like this:
 * +----------+-----------------+--+
 * |qxClick   | qx=customButton |  |
 * +----------+-----------------+--+
 * Note: The qooxdoo locator can be used with any selenium command, like
 * +----------+-----------------+--+
 * |mouseOver | qx=customButton |  |
 * +----------+-----------------+--+
 *
 * The locator can also be used hierarchically.
 * This is comfortable, if qooxdoo elements are reused in different locations.
 * Example:
 *  A OK-button is placed in a dialog box (and other dialog-boxes). And You
 *  don't want to give the same button different UserData as it is still an
 *  OK-button.  So apply an UserData for the dialog-box, e.g. "myDialog" and
 *  name the button "buttonOK" Now this button can be located with:
 *  qx=myDialog/buttonOK or e.g. qx=scndDialog/buttonOK
 *
 * dom-events reference: http://www.howtocreate.co.uk/tutorials/javascript/domevents
 *
 * EXTERNAL INTERFACES
 *  Each user extension for Selenium uses interfaces from the Selenium runtime
 *  environment, like the 'Selenium', 'PageBot', 'SeleniumError' and 'LOG' 
 *  objects, or the 'triggerEvent' and 'getClientXY' functions. For more 
 *  information, see the file 'user-extensions.js.sample' in the Selenium Core 
 *  distribution.
 *
 * Changed to work with selenium 0.8.3
 *
 * Based on the orginal Selenium user extension for qooxdoo (version: 0.3)
 * by Robert Zimmermann
 */

// -- Config section ------------------------------------------------
var initGetViewportByHand = true;
// -- Config end ----------------------------------------------------

Selenium.prototype.qx = {};

// ***************************************************
// Handling of MouseEventParameters
// ***************************************************
/**
* Helper to parse a param-String and provide access to the parameters with default-value handling
*
* @param customParameters string with name1=value1, name2=value2 whitespace will be ignored/stripped
* @param isIEevent boolean if true treat buttons IE-like, false treat it like all other user-agents do
*/
Selenium.prototype.qx.MouseEventParameters = function (customParameters)
{
  this.customParameters = {};

  if (customParameters && customParameters !== "")
  {
    var paramPairs = customParameters.split(",");

    for (var i=0; i<paramPairs.length; i++)
    {
      var onePair = paramPairs[i];
      var nameAndValue = onePair.split("=");

      // rz: using String.trim from htmlutils.js of selenium to get rid of whitespace
      var name = new String(nameAndValue[0]).trim();
      var value = new String(nameAndValue[1]).trim();
      this.customParameters[name] = value;
    }
  }
}

Selenium.prototype.qx.MouseEventParameters.MOUSE_BUTTON_MAPPING_IE =
{
  "left"   : 1,
  "right"  : 2,
  "middle" : 4
};

Selenium.prototype.qx.MouseEventParameters.MOUSE_BUTTON_MAPPING_OTHER =
{
  "left"   : 0,
  "right"  : 2,
  "middle" : 1
};


/**
 * TODOC
 *
 * @type member
 * @param buttonName {var} TODOC
 * @return {var} TODOC
 */
Selenium.prototype.qx.MouseEventParameters.prototype.getButtonValue = function(buttonName)
{
  if (document.createEventObject)
  {
    LOG.debug("MouseEventParameters.prototype.getButtonValue - using IE Button-Mapping");
    return Selenium.prototype.qx.MouseEventParameters.MOUSE_BUTTON_MAPPING_IE[buttonName];
  }
  else
  {
    LOG.debug("MouseEventParameters.prototype.getButtonValue - using OTHER Button-Mapping");
    return Selenium.prototype.qx.MouseEventParameters.MOUSE_BUTTON_MAPPING_OTHER[buttonName];
  }
};


/**
 * Returns an value if found for given paramName.
 *  If not found, given defaultValue is returned
 * 
 * Type-conversion is donne for string, boolean and number automatically
 *  based on type of the given defaultValue.
 *
 * @type member
 * @param paramName {var} string name of parameter to search for
 * @param defaultValue {var} <different types> default value to be returned, if no value is found
 *            the type is important, see documentation above for details
 * @return {var} TODOC
 */
Selenium.prototype.qx.MouseEventParameters.prototype.getParamValue = function(paramName, defaultValue)
{
  if (this.customParameters[paramName])
  {
    if (paramName == "button")
    {
      // special handling for mousebutton values (IE and not IE)
      return this.getButtonValue(this.customParameters["button"]);
    }
    else
    {
      // return converted type according to type of default value
      if (typeof defaultValue == "string")
      {
        // string
        return this.customParameters[paramName];
      }

      var strValue = this.customParameters[paramName];

      if (typeof defaultValue == "boolean")
      {
        // boolean
        return strValue === "true" ? true : false;
      }

      if (typeof defaultValue == "number")
      {
        // number
        return parseInt(strValue);
      }
    }
  }
  else
  {
    // TODO: refactoring: resolve duplication
    if (paramName == "button")
    {
      // special handling for mousebutton values (IE and not IE)
      return this.getButtonValue(defaultValue);
    }
    else
    {
      return defaultValue;
    }
  }
};

// ***************************************************
// END: Handling of MouseEventParameters
// ***************************************************
/**
 * TODOC
 *
 * @type member
 * @param buttonName {var} TODOC
 * @return {var} TODOC
 */
Selenium.prototype.qx.triggerMouseEventQx = function (eventType, element, eventParamObject)
{
  if (!eventParamObject)
  {
    // this can only be, if the internal call-chain is wrong
    LOG.error("triggerMouseEventQx: eventParamObject is essential");
    return;
  }

  // use custom event details or default value
  var button = eventParamObject.getParamValue("button", "left");
  var bubbles = eventParamObject.getParamValue("bubbles", true);
  var cancelable = eventParamObject.getParamValue("cancelable", true);
  var detail = eventParamObject.getParamValue("detail", 1);
  var screenX = eventParamObject.getParamValue("screenX", 0);
  var screenY = eventParamObject.getParamValue("screenY", 0);
  var clientX = eventParamObject.getParamValue("clientX", 0);
  var clientY = eventParamObject.getParamValue("clientY", 0);
  var ctrlKey = eventParamObject.getParamValue("ctrlKey", false);
  var shiftKey = eventParamObject.getParamValue("shiftKey", false);
  var altKey = eventParamObject.getParamValue("altKey", false);
  var metaKey = eventParamObject.getParamValue("metaKey", false);

  //    window     = null; //TODO: use correctly
  /* for event dbugging
      LOG.debug(" * called triggerMouseEventQx, params:");
      LOG.debug("eventType=" + eventType);
      LOG.debug("element=" + element);
      LOG.debug("bubbles=" + bubbles);
      LOG.debug("cancelable=" + cancelable);
      LOG.debug("detail=" + detail);
      LOG.debug("screenX=" + screenX);
      LOG.debug("screenY=" + screenY);
      LOG.debug("clientX=" + clientX);
      LOG.debug("clientY=" + clientY);
      LOG.debug("ctrlKey=" + ctrlKey);
      LOG.debug("shiftKey=" + shiftKey);
      LOG.debug("altKey=" + altKey);
      LOG.debug("metaKey=" + metaKey);
      LOG.debug("button=" + button);
      LOG.debug(" * END triggerMouseEventQx, params:");
  */

  var evt = null;

  if (document.createEvent)
  {
    LOG.debug("triggerMouseEventQx: default-user-agent-path");
    evt = document.createEvent("MouseEvents");

    // rz: has to be "initMouseEvent" otherwise parameters like clientX won't be set
    evt.initMouseEvent(eventType, bubbles, cancelable, document.defaultView, detail, screenX, screenY, clientX, clientY, ctrlKey, altKey, shiftKey, metaKey, button, null);
    element.dispatchEvent(evt);
  }
  else if (document.createEventObject)
  {
    LOG.debug("triggerMouseEventQx: IE-path");
    evt = element.ownerDocument.createEventObject();

    evt.detail = detail;
    evt.screenX = screenX;
    evt.screenY = screenY;
    evt.clientX = clientX;
    evt.clientY = clientY;
    evt.ctrlKey = ctrlKey;
    evt.altKey = altKey;
    evt.shiftKey = shiftKey;
    evt.metaKey = metaKey;
    evt.button = button;
    evt.relatedTarget = null;

    element.fireEvent('on' + eventType, evt);
  }
}


/**
 * Clicks on a qooxdoo-element.
 * mousedown, mouseup will be fired instead of only click (which is named execute in qooxdoo)
 * 
 * eventParams example: button=left|right|middle, clientX=300, shiftKey=true
 *             for a full list of properties see "function Selenium.prototype.qx.triggerMouseEventQx"
 *
 * @type member
 * @param locator {var} an element locator
 * @param eventParams {var} additional parameter for the mouse-event to set. e.g. clientX.
 *            if no eventParams are set, defaults will be: left-mousebutton, all keys false and all coordinates 0
 * @return {void} 
 */
Selenium.prototype.doQxClick = function(locator, eventParams)
{
  var element = this.page().findElement(locator);
  this.clickElementQx(element, eventParams);
};


Selenium.prototype.doQxExecute = function(locator, eventParams)
{
  var element = this.page().findElement(locator);
  if (element.qx_Widget && element.qx_Widget.execute)
  {
    element.qx_Widget.execute();
  } else
  {
    LOG.debug("qxExecute: Cannot invoke execute() on element: "+element);
  }
};


Selenium.prototype.doGetViewport = function(locator, eventParams)
{
  var docelem = this.page().findElement("dom=document"); // evtl. document.body
  //var win     = docelem.parentWindow? docelem.parentWindow : docelem.defaultView;
  var win     = selenium.browserbot.getCurrentWindow();

  // clear old geom string
  if (storedVars && storedVars['ViewportStr']) {
    delete storedVars['ViewportStr'];
  }
  
  // event handler to capture coordinates
  function eh(e)
  {
    // get coordinates
    var mouseX;
    var mouseY; // relat. mouse coords
    // this is from quirksmode.org
    if (e.pageX || e.pageY)
    {
      mouseX = e.pageX;
      mouseY = e.pageY;
      LOG.debug("pageX, pageY: "+mouseX+"'"+mouseY);
    } else if (e.clientX || e.clientY)
    {
      mouseX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft; 
      mouseY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
      LOG.debug("e.clientX,e.clientY,document.body.scrollLeft,document.documentElement.scrollLeft,document.body.scrollTop,document.documentElement.scrollTop:\n"+
                e.clientX+','+e.clientY+','+document.body.scrollLeft+','+document.documentElement.scrollLeft+','+document.body.scrollTop+','+document.documentElement.scrollTop);
    } else
    {
      mouseX = 0;
      mouseY = 0;
      LOG.debug("no X,Y coords from event object");
    }
    LOG.debug("e.screenX,e.screenY: "+e.screenX+','+e.screenY);
    var originX = e.screenX - mouseX;
    var originY = e.screenY - mouseY;
    width   = PageBot.prototype._getWinWidth(win);
    height  = PageBot.prototype._getWinHeight(win);
    var geom = width+'x'+height+'+'+originX+'+'+originY;
    LOG.info("Page geometry (WxH+X+Y): "+ geom);
    // write to var
    if (! storedVars)
    {
      storedVars = {};
    }
    storedVars['ViewportStr'] = geom;
    // de-register myself
    PageBot.prototype._removeEventListener(docelem, "click", eh);
  };

  // register handler
  PageBot.prototype._addEventListener(docelem, "click", eh);

  // fire a mouse event at 0,0
  if (initGetViewportByHand) {
    //alert("Please click anywhere in the document"); // destroys event handling!!!
  } else {
    // this is essentially useless since the resulting mouse event lacks screenX
    // and screenY coords
    this.doQxClickAt("dom=document", "clientX=0,clientY=0");  // 0,0
  }
  /*
  var eventParamObject = new Selenium.prototype.qx.MouseEventParameters();
  this.browserbot.triggerMouseEventQx("click", docelem,eventParamObject);
  */

};


/**
 * Clicks on a qooxdoo-element.
 * mousedown, mouseup will be fired instead of only click
 * additionaly to doQxClick the x-/y-coordinates of located element will be determined.
 * TODO: implement it like doFooAt, where additional coordinates will be added to the element-coords
 * 
 * eventParams example: button=left|right|middle, clientX=300, shiftKey=true
 *             for a full list of properties see "function Selenium.prototype.qx.triggerMouseEventQx"
 *
 * @type member
 * @param locator {var} an element locator
 * @param eventParams {var} additional parameter for the mouse-event to set. e.g. clientX.
 *            if no eventParams are set, defaults will be: left mousebutton, all keys false and all coordinates 0
 * @return {void} 
 */
Selenium.prototype.doQxClickAt = function(locator, eventParams)
{
  var element = this.page().findElement(locator);
  var coordsXY = getClientXY(element);
  LOG.debug("computed coords: X=" + coordsXY[0] + " Y=" + coordsXY[1]);

  // TODO: very dirty no checking, maybe refactoring needed to get doQxClick and doQxClickAt to work smoothly together.
  var newEventParamString = eventParams + ",clientX=" + coordsXY[0] + ",clientY=" + coordsXY[1];
  LOG.debug("newEventParamString=" + newEventParamString);
  this.clickElementQx(element, newEventParamString);
};


/**
 * TODOC
 *
 * @type member
 * @param element {var} TODOC
 * @param eventParamString {var} TODOC
 * @return {void} 
 */
Selenium.prototype.clickElementQx = function(element, eventParamString)
{
  var additionalParamsForClick = new Selenium.prototype.qx.MouseEventParameters(eventParamString);

  triggerEvent(element, 'focus', false);
  Selenium.prototype.qx.triggerMouseEventQx('mouseover', element, additionalParamsForClick);
  Selenium.prototype.qx.triggerMouseEventQx('mousedown', element, additionalParamsForClick);
  Selenium.prototype.qx.triggerMouseEventQx('mouseup', element, additionalParamsForClick);
  Selenium.prototype.qx.triggerMouseEventQx('click', element, additionalParamsForClick);
  // do not blur or mouseout as additional events won't be fired correctly
// FIXME: include original "click" functionality
};

/**
 * Check wheather an qooxdoo Element is enabled or not
 *
 * @type member
 * @param locator {var} an element locator
 * @return {var} TODOC
 * @throws TODOC
 */
Selenium.prototype.isQxEnabled = function(locator)
{
  LOG.debug("isQxEnabled: locator.substr(0,3)=" + locator.substr(0, 3));

  if (locator.substr(0, 2) === "qx")
  {
    var qxxLocator;

    if (locator.substr(0, 3) === "qx=") {
      qxxLocator = "qxx=" + locator.substr(3, locator.length - 1);
    } else if (locator.substr(0, 4) === "qxp=") {
      throw new SeleniumError("NotImplemented: isQxEnabled for qxp Locator not yet implemented.");
    } else {
      throw new SeleniumError("Error: Bad qooxdoo-Locator-Syntax for locator: " + locator);
    }

    LOG.debug("isQxEnabled: qxxLocator=" + qxxLocator);
    var qxObject = this.page().findElement(qxxLocator);
    if (qxObject) {
      while (qxObject.getEnabled() === "inherit") {
        qxObject = qxObject.getParent();
      }
      return qxObject.getEnabled();
    } else {
      throw new SeleniumError("No such object: " + locator)
    }
  }
  else
  {
    throw new SeleniumError("Error: No qooxdoo-Locator given. This command only runs with qooxdoo-Locators");
  }
};

// ****************************************
// qooxdoo-locator (qx=) and special (qxx=)
// ****************************************
/**
 * Finds an qooxdoo-Object (!) identified by qooxdoo userData attribute
 *  Note: Here the Selenium locator abstraction is used to get an js-object _not_ an DOM-element
 * 
 * locator syntax: qxx=oneId/childId1/childId2
 *   note: childs can also be found directly if their qooxdoo-Id is unique in the current application state
 *         if multiple id's exist in qooxdoo, the first found is used!
 * trailing and preceeding "/" are invalid (like qx=/el1/el2/) and will be ignored
 * also surplus "/" are ignored (like qx=el1//el2)
 *
 * @type member
 * @param qxLocator {var} TODOC
 * @param inDocument {var} TODOC
 * @param inWindow {var} TODOC
 * @return {var} TODOC
 */
PageBot.prototype.locateElementByQxx = function(qxLocator, inDocument, inWindow)
{
  LOG.info("Locate qooxdoo-Object by qooxdoo-UserData-Locator=" + qxLocator + ", inDocument=" + inDocument + ", inWindow=" + inWindow.location.href);

  var qxObject = this._findQxObjectInWindow(qxLocator, inWindow);

  if (qxObject) {
    return qxObject;
  }
};


/**
 * Finds an element identified by qooxdoo userData attribute
 * 
 * locator syntax: qx=oneId/childId1/childId2
 *   note: childs can also be found directly if their qooxdoo-Id is unique in the current application state
 *         if multiple id's exist in qooxdoo, the first found is used!
 * trailing and preceeding "/" are invalid (like qx=/el1/el2/) and will be ignored
 * also surplus "/" are ignored (like qx=el1//el2)
 *
 * @type member
 * @param qxLocator {var} TODOC
 * @param inDocument {var} TODOC
 * @param inWindow {var} TODOC
 * @return {var} TODOC
 */
PageBot.prototype.locateElementByQx = function(qxLocator, inDocument, inWindow)
{
  LOG.info("Locate Element by qooxdoo-UserData-Locator=" + qxLocator + ", inDocument=" + inDocument + ", inWindow=" + inWindow.location.href);

  var qxObject = this._findQxObjectInWindow(qxLocator, inWindow);

  if (qxObject) {
    return qxObject.getElement();
  }
};


/**
 * Finds an element identified by qooxdoo userData attribute, followed by a xpath expression
 * 
 * locator syntax: qxp=oneId/childId1/childId2//xpath
 * 
 * TODO: Test this addition
 * credits: Sebastian Dauss
 *
 * @type member
 * @param qxLocator {var} TODOC
 * @param inDocument {var} TODOC
 * @param inWindow {var} TODOC
 * @return {null | var} TODOC
 * @throws TODOC
 */
PageBot.prototype.locateElementByQxp = function(qxLocator, inDocument, inWindow)
{
  LOG.info("Locate Element by qooxdoo-UserData-XPath-Locator=" + qxLocator + ", inDocument=" + inDocument + ", inWindow=" + inWindow.location.href);

  var locatorParts = qxLocator.split('//');

  if (locatorParts.length !== 2) {
    throw new SeleniumError("Error: wrong QXP locator syntax. need: qx1/qx2/.../qxn//xpath");
  }

  var qxPart = locatorParts[0];
  var xpathPart = locatorParts[1];

  if (!qxPart) {
    throw new SeleniumError("Error: wrong QXP locator syntax, qx-Part must not be empty. hint: use xpath locator instead");
  }

  if (!xpathPart) {
    throw new SeleniumError("Error: wrong QXP locator syntax, xpath-Part must not be empty. hint: use qx locator instead");
  }

  var qxObject = this._findQxObjectInWindow(qxPart, inWindow);

  if (!qxObject) {
    return null;
  }

  var qxElement = qxObject.getElement();  
  
  var resultElement;
  if (this.locateElementByXPath){
  
    //Selenium 1.0: Use public function locateElementByXPath
    resultElement =       this.locateElementByXPath('descendant-or-self::node()/'+xpathPart, qxElement, inWindow);
  } else {
    //Selenium 0.9.2: Use internal function _findElementUsingFullXPath
    resultElement = this._findElementUsingFullXPath('descendant-or-self::node()/'+xpathPart, qxElement, inWindow);
  }
    
  return resultElement;
};


/**
 * Finds an element identified by qooxdoo object hierarchy, down from the Application object
 * 
 * locator syntax: qxh=firstLevelChild/secondLevelChild/thirdLevelChild
 * 
 *    where on each level the child can be identified by:
 *    - an identifier (which will be taken as a literal object member of the
 *      parent)
 *    - a special identifier starting with "qx." (this will be taken as a
 *      qooxdoo class signifying the child, e.g. "qx.ui.form.Button") [TODO]
 *    - "child[n]" (where n signifies the nth child of the current parent) [TODO]
 *    -
 *
 * @type member
 * @param qxLocator {var} TODOC
 * @param inDocument {var} TODOC
 * @param inWindow {var} TODOC
 * @return {var | null} TODOC
 */
PageBot.prototype.locateElementByQxh = function(qxLocator, inDocument, inWindow)
{
  LOG.info("Locate Element by qooxdoo-Object-Hierarchy-Locator=" + qxLocator + ", inDocument=" + inDocument + ", inWindow=" + inWindow.location.href);

  var qxObject = this._findQxObjectInWindowQxh(qxLocator, inWindow);

  if (qxObject) {
    return qxObject.getElement();
  } else {
    return null;
  }
};

/**
 * Returns the client document instance or null if Init.getApplication() returned null. 
 * Reason is that qooxdoo 0.7 relies on the application being set when the client document
 * is accessed  
 *
 * @type member
 * @param inWindow {var} window too get client document for
 * @return {qx.ui.core.ClientDocument | null} document or null
 */
PageBot.prototype._getClientDocument = function(inWindow){
  
  //In qooxdoo 0.7, qx.ui.core.ClientDocument.getInstance() triggers the autoflush
  //mechanism in qooxdoo. This will cause the rendering queues to be flushed.
  //If the application is not set yet, Widget.flushGlobalQueues will fail.
  //
  //So prevent access to the client document until application is set
  if ((inWindow != null)
       && (inWindow.qx != null)
       && (inWindow.qx.core.Init != null)
       && (inWindow.qx.core.Init.getInstance() != null)      
       && (inWindow.qx.core.Init.getInstance().getApplication() != null)
     ){
    return inWindow.qx.ui.core.ClientDocument.getInstance();
  } else{
    return null;
  }
}


/**
 * TODOC
 *
 * @type member
 * @param qxLocator {var} TODOC
 * @param inWindow {var} TODOC
 * @return {null | var} TODOC
 * @throws TODOC
 */
PageBot.prototype._findQxObjectInWindowQxh = function(qxLocator, inWindow)
{
  if (!inWindow) {
    throw new Error("No AUT window. Internal Error.");
  }

  var qxResultObject = null;

  // the AUT window must contain the qx-Object
  var qxAppRoot;

  if (inWindow.qx)
  {
    LOG.debug("qxLocator: qooxdoo seems to be present in AUT window. Try to get the Instance");
    // check for object space spec
    if (qxLocator.match('^app:')) 
    {
      qxAppRoot = inWindow.qx.core.Init.getInstance().getApplication();
    } else 
    {
      qxAppRoot = this._getClientDocument(inWindow);
      if (qxAppRoot == null){
        LOG.debug("qx-Locator: Cannot access Init.getApplication() (yet), cannot search. inWindow=" + inWindow.location.href + ", inWindow.qx=" + inWindow.qx);
        return null;
      }
    }
    this._globalQxObject = inWindow.qx;
  }

  else
  {
    LOG.debug("qx-Locator: qx-Object not defined, object not found. inWindow=" + inWindow.location.href + ", inWindow.qx=" + inWindow.qx);

    // do not throw here, as if the locator fails in the first place selenium will call this
    // again with all frames (and windows?) which won't result in "element not found" but in
    // qooxdoo not beeing availabel.
    return null;
  }

  LOG.debug("qxLocator All basic checks passed.");

  // treat qxLocator
  qxLocator = qxLocator.replace(/^[a-z]+:/i,"");  // remove optional object space spec (settled above)
  var qxhParts = qxLocator.split('/');

  try {
    qxResultObject = this._searchQxObjectByQxHierarchy(qxAppRoot, qxhParts);
  }
  catch(e)
  {
    if (e.a instanceof Array)
    {
      // throw new SeleniumError("qooxdoo-Element " + e.join('/') + " not found");
      LOG.debug("Qxh Locator: Could not resolve last element of: " + e.a.join('/'));

      // return null; // for now just return null
      throw e;
    }
    else
    {  // re-raise
      throw e;
    }
  }

  return qxResultObject;
};


/**
 * TODOC
 *
 * @type member
 * @param qxLocator {var} TODOC
 * @param inWindow {var} TODOC
 * @return {null | var} TODOC
 * @throws TODOC
 */
PageBot.prototype._findQxObjectInWindow = function(qxLocator, inWindow)
{
  if (!inWindow) {
    throw new Error("No AUT window. Internal Error.");
  }

  var qxResultObject;

  // the AUT window must contain the qx-Object
  if (inWindow.qx)
  {
    LOG.debug("qxLocator: qooxdoo seems to be present in AUT window. Try to get the Instance using (qx.ui.core.ClientDocument.getInstance())");
    qxResultObject = this._getClientDocument(inWindow);
    if (qxResultObject == null){
      LOG.debug("qx-Locator: Cannot access Init.getApplication() (yet), cannot search. inWindow=" + inWindow.location.href + ", inWindow.qx=" + inWindow.qx);
      return null;
    }
  }
  else
  {
    LOG.debug("qx-Locator: qx-Object not defined, object not found. inWindow=" + inWindow.location.href + ", inWindow.qx=" + inWindow.qx);

    // do not throw here, as if the locator fails in the first place selenium will call this
    // again with all frames (and windows?) which won't result in "element not found" but in
    // qooxdoo not beeing availabel.
    return null;
  }

  LOG.debug("qxLocator All basic checks passed.");

  var qxPathList = qxLocator.split("/");

  for (var i=0; i<qxPathList.length; i++)
  {
    // ignore additional "/"
    if (qxPathList[i] !== "")
    {
      if (!qxResultObject)
      {
        LOG.error("qx-locator path-element can not be searched. invalid qooxdoo object. path-element=" + qxPathList[i]);
        return null;
      }

      qxResultObject = this._searchQxObjectByQxUserData(qxResultObject, qxPathList[i]);
    }
  }

  if (qxResultObject)
  {
    LOG.debug("qxResultObject=" + qxResultObject + ", element=" + qxResultObject.getElement());
    return qxResultObject;
  }
  else
  {
    LOG.error("qx-locator: element not found for locator: qx-locator=" + qxLocator);
    return null;
  }
};


/**
 * TODOC
 *
 * @type member
 * @param obj {Object} TODOC
 * @param userDataSearchString {var} TODOC
 * @return {null | void | var} TODOC
 */
PageBot.prototype._searchQxObjectByQxUserData = function(obj, userDataSearchString)
{
  if (!obj) {
    return null;
  }

  if (!obj.getChildren) {
    return;
  }

  var children = obj.getChildren();

  if (!children || children.length === 0) {
    return;
  }

  for (var i=0; i<children.length; i++)
  {
    var child = children[i];
    var description = child.getUserData(userDataSearchString);

    if (description)
    {
      LOG.info("qx-widget found for userDataSearchString=" + userDataSearchString + " - returning Object=" + child);
      return child;
    }
    else
    {
      var result = this._searchQxObjectByQxUserData(child, userDataSearchString);

      if (result) {
        return result;
      }
    }
  }

  return null;
};


PageBot.prototype.qx = {};  // create qx name space
// some regexps, to safe stack space
PageBot.prototype.qx.IDENTIFIER = new RegExp('^[a-z$][a-z0-9_\.$]*$', 'i');
PageBot.prototype.qx.NTHCHILD = /^child\[\d+\]$/i;
PageBot.prototype.qx.ATTRIB = /^\[.*\]$/;



/**
 * TODOC
 *
 * @type member
 * @param root {var} TODOC
 * @param path {var} TODOC
 * @return {null | Element | var} TODOC
 * @throws TODOC
 */
PageBot.prototype._searchQxObjectByQxHierarchy = function(root, path)
{
  // recursive traverse the path
  // currently, we only return single elements, not sets of matching elements
  if (path.length == 0) {
    return null;
  }
  if (typeof(root) != "object") { // can only traverse (qooxdoo) objects
    return null;
  }
  if (root == null) {
    throw new SeleniumError("QxhPath: Cannot determine descendant from null root for: " + path);
  }

  var el = null;  // the yet to find current element
  var step = path[0];  // the current part of the QPath expression
  var npath = path.slice(1); // new path - rest of path

  LOG.debug("Qxh Locator: Inspecting current step: " + step);

  // get a suitable element from the current step, dispatching on step type
  if (step == '*')                 // this is like '//' in XPath
  {
    // this means we have to recursively look for rest of path among descendants
    LOG.debug("Qxh Locator: ... identified as wildcard (*) step");
    var res = null;

    // first check if current element matches already
    if (npath == 0)
    {
      // no more location specifier, * matches all, so return current element
      return root;
    }
    else
    {
      // there is something to match against
      try
      {
        LOG.debug("Qxh Locator: recursing with root: "+root+", path: "+npath.join('/'));
        res = this._searchQxObjectByQxHierarchy(root, npath);
      }
      catch (e)
      {
        if (e.a instanceof Array)
        {
          // it's an exception thrown by myself - just continue search
          ;
        }
        else 
        {
          throw e;
        }
      }
    }
    // check what we've got - can't be null
    if (res != null)
    {
      return res;
    }

    // then recurse with children, using original path
    var childs = this._getQxNodeDescendants(root);
    
    for (var i=0; i<childs.length; i++)
    {
      try
      {
        LOG.debug("Qxh Locator: recursing with root: "+childs[i]+", path: "+path.join('/'));
        res = this._searchQxObjectByQxHierarchy(childs[i], path);
      }
      catch (e)
      {
        if (e.a instanceof Array)
        {
          // it's an exception thrown by a descendant - just continue search
          continue;
        }
        else 
        {
          throw e;
        }
      }
      // when we reach this we have a hit
      return res;
    }

    // let's see how we came out of the loop
    // all recursion is already done, so we can terminate here
    if (res == null)
    {
      var e = new SeleniumError("Qxh Locator: Error resolving qxh path");
      e.a = [ step ]; // since we lost the e from deeper recursions just report current
      throw e;
    }
    else 
    {
      return res; // this should be superfluous
    }
  }

  else if (step.match(this.qx.IDENTIFIER))
  {
    if (step.indexOf('qx.') != 0)  // 'foo' format
    {
      LOG.debug("Qxh Locator: ... identified as general identifier");
      el = this._getQxElementFromStep1(root, step);
    }
    else
    {  // 'qx....' format
      LOG.debug("Qxh Locator: ... identified as qooxdoo class name");
      el = this._getQxElementFromStep2(root, step);
    }
  }

  else if (step.match(this.qx.NTHCHILD))  // 'child[n]' format
  {
    LOG.debug("Qxh Locator: ... identified as indexed child");
    el = this._getQxElementFromStep3(root, step);
  }

  else if (step.match(this.qx.ATTRIB))  // '[@..=...]' format
  {
    LOG.debug("Qxh Locator: ... identified as attribute specifier");
    el = this._getQxElementFromStep4(root, step);
  }

  else  // unknown step format
  {
    throw new SeleniumError("QPath: Illegal step: " + step);
  }

  // check result
  if (el == null)
  {
    var e = new SeleniumError("Qxh Locator: Error resolving qxh path");
    e.a = [ step ];
    throw e;
  }

  // recurse
  if (npath.length == 0) {
    LOG.debug("Qxh Locator: Terminating search, found match; last step :"+step+", element: "+el);
    return el;
  }
  else
  {
    // basically we tail recurse, but catch exceptions
    try {
      LOG.debug("Qxh Locator: tail-recursing with root: "+el+"(fixed step: '"+step+"'), path: "+npath.join('/'));
      var res = this._searchQxObjectByQxHierarchy(el, npath);
    }
    catch(e)
    {
      if (e.a instanceof Array)
      {
        // prepend the current step
        e.a.unshift(step);
        LOG.debug("Qxh Locator: ... nothing found in this branch; going up");
        throw e;
      }
      else
      {  // re-raise
        throw e;
      }
    }

    return res;
  }
};  // _searchQxObjectByQxHierarchy()


/**
 * 'button1' (from 'w.button1') - step specifier
 *
 * @type member
 * @param root {var} TODOC
 * @param step {var} TODOC
 * @return {var | null} TODOC
 */
PageBot.prototype._getQxElementFromStep1 = function(root, step)
{
  // find an object member of root with name 'step'
  LOG.debug("Qxh Locator: in _getQxElementFromStep1");
  var member;

  for (member in root)
  {
    if (member == step) {
      return root[member];
    }
  }

  return null;
};


/**
 * 'qx.ui.form.Button' - step specifier
 *
 * @type member
 * @param root {var} TODOC
 * @param qxclass {var} TODOC
 * @return {var | null} TODOC
 */
PageBot.prototype._getQxElementFromStep2 = function(root, qxclass)
{
  // find a child of root with qooxdoo type 'qxclass'
  LOG.debug("Qxh Locator: in _getQxElementFromStep2");
  var childs;
  var curr;

  // need to get to the global 'qx' object
  if (this._globalQxObject) {
    var qx = this._globalQxObject;
    var myClass = qx.Class.getByName(qxclass);
  } else {
    throw new SeleniumError("Qxh Locator: Need global qx object to search by attribute");
  }

  childs = this._getQxNodeDescendants(root);

  for (var i=0; i<childs.length; i++)
  {
    curr = childs[i];

    if (curr instanceof myClass) {
      return curr;
    }
  }

  return null;
};


/**
 * 'child[3]' - step specifier
 *
 * @type member
 * @param root {var} TODOC
 * @param childspec {var} TODOC
 * @return {null | var} TODOC
 */
PageBot.prototype._getQxElementFromStep3 = function(root, childspec)
{
  // find a child of root by index
  LOG.debug("Qxh Locator: in _getQxElementFromStep3");
  var childs;
  var idx;
  var m;

  // extract child index
  m = /child\[(\d+)\]/i.exec(childspec);

  if ((m instanceof Array) && m.length > 1) {
    idx = m[1];
  } else {
    return null;
  }

  childs = this._getQxNodeDescendants(root);

  if (idx < 0 || idx >= childs.length) {
    return null;
  } else {
    return childs[idx];
  }
};


/**
 * '[@label="hugo"]' - step specifier
 *
 * @type member
 * @param root {var} TODOC
 * @param attribspec {var} TODOC
 * @return {null | var} TODOC
 * @throws TODOC
 */
PageBot.prototype._getQxElementFromStep4 = function(root, attribspec)
{
  // find a child of root by attribute
  LOG.debug("Qxh Locator: in _getQxElementFromStep4");
  var childs;
  var attrib;
  var attval;
  var rattval;
  var actobj;
  var m;


  // need to get to the global 'qx' object
  if (this._globalQxObject) {
    var qx = this._globalQxObject;
  } else {
    throw new SeleniumError("Qxh Locator: Need global qx object to search by attribute");
  }

  // extract attribute and value
  m = /\[@([^=]+)(?:=(.+))?\]$/.exec(attribspec);

  if ((m instanceof Array) && m.length > 1)
  {
    LOG.debug("Qxh Locator: _getQxElementFromStep4: parsed spec into: "+m);
    attrib = m[1];
    if (m.length > 2 && m[2]!=null)
    {
      attval = m[2];

      // strip possible quotes from attval
      if (attval.match(/^['"].*['"]$/)) {
        attval = attval.slice(1, attval.length - 1);
      }

      // it's nice to match against regexp's
      rattval = new RegExp(attval);
        
    }
  }
  else
  {
    return null;
  }

  if (attval == null) // no compare value -> attrib on root must contain obj ref
  {
    actobj = this.qx._getGeneralProperty(root, attrib, qx);
    if (typeof(actobj) == "object")
    {
      return actobj; // only return an obj ref
    } else 
    {
      return null;
    }
  }

  childs = this._getQxNodeDescendants(root);

  for (var i=0; i<childs.length; i++)
  {
    // For every child, we check various ways where it might match with the step
    // specifier (generally using regexp match to compare strings)
    actobj = childs[i];

    // check properties first
    // var qxclass = qx.Class.getByName(actobj.classname);
    if (actobj.constructor)
    {
      var hasProp = qx.Class.hasProperty(actobj.constructor, attrib);  // see qx.Class API

      if (hasProp)
      {
        var currval = actobj.get(attrib);
        LOG.debug("Qxh Locator: Attribute Step: Checking for qooxdoo property ('" + attrib + "' is: " + currval + ")");

        if (currval && currval.match(rattval)) {
          return actobj;
        }
      }
    }

    // then, check normal JS attribs
    if ((attrib in actobj) && ((String(actobj[attrib])).match(rattval)))
    {
      LOG.debug("Qxh Locator: Attribute Step: Checking for JS object property");
      return actobj;
    }

    /*
    // last, if it is a @label attrib, try check the label of the widget
    // [this might be superfluous, since it seems that 'getLabel()' is covered
    // by 'get("label")' in the property section above]
    if (/^label$/i.exec(attrib))
    {
      LOG.debug("Qxh Locator: Attribute Step: Checking for qooxdoo widget label");

      // try getLabel() method
      if (actobj.getLabel)
      {
        if ((actobj.getLabel()).match(rattval)) {
          return actobj;
        }
      }
    }
    */
    else
    {
      LOG.debug("Qxh Locator: Attribute Step: No match for current child");
    }
  }

  return null;
};  // _getQxElementFromStep4()


/**
 * using different approaches to locate a node's direct descendants (children of
 * some kind)
 *
 * @type member
 * @param node {Node} TODOC
 * @return {var} TODOC
 */
PageBot.prototype._getQxNodeDescendants = function(node)
{
  var descArr = [];
  var c;

  // check TreeFolder items
  if (node.getItems) {
    LOG.debug("getQxNodeDescendants: using getItems() to retrieve descendants");
    descArr = descArr.concat(node.getItems());
  }

  // check widget children (built with w.add())
  else if (node.getChildren) {
    c = node.getChildren();
    LOG.debug("getQxNodeDescendants: using getChildren() to retrieve descendants");
        // +" (got: "+ (c.length? c.length: 0)+")");
    descArr = descArr.concat(c);
  }

  // use JS object members
  else
  {
    LOG.debug("getQxNodeDescendants: using JS properties to retrieve descendants");
    for (var m in node) {
      descArr.push(node[m]);
    }
  }

  // only select useful subnodes (only objects, no circular refs, etc.)
  // TODO: circular refs which are *not* immediate!
  var descArr1 = [];
  for (var i=0; i<descArr.length; i++)
  {
    var curr = descArr[i];
    if ((typeof(curr) == "object") && (curr != node) && (curr != null))
    {
      descArr1.push(descArr[i]);
    }
  }

  LOG.debug("getQxNodeDescendants: returning for node : "+node+" immediate children: "+descArr1);
  return descArr1;
};  // _getQxNodeDescendants()


PageBot.prototype.qx._getGeneralProperty = function(actobj, attrib, qx)
{
  // check properties first
  // var qxclass = qx.Class.getByName(actobj.classname);
  if (actobj.constructor)
  {
    var hasProp = qx.Class.hasProperty(actobj.constructor, attrib);  // see qx.Class API

    if (hasProp)
    {
      //LOG.debug("Qxh Locator: Attribute Step: Checking for qooxdoo property ('" + attrib + "' is: " + currval + ")");
      var currval = actobj.get(attrib);
      return currval;
    }
  }

  // then, check normal JS attribs
  if (attrib in actobj)
  {
    //LOG.debug("Qxh Locator: Attribute Step: Checking for JS object property");
    return actobj[attrib];
  }

  /*
  // last, if it is a @label attrib, try check the label of the widget
  // [this might be superfluous, since it seems that 'getLabel()' is covered
  // by 'get("label")' in the property section above]
  if (/^label$/i.exec(attrib))
  {
    LOG.debug("Qxh Locator: Attribute Step: Checking for qooxdoo widget label");

    // try getLabel() method
    if (actobj.getLabel)
    {
      if ((actobj.getLabel()).match(rattval)) {
        return actobj;
      }
    }
  }
  */
  return null;
};


// code from qx.html.EventRegistration.js

PageBot.prototype._addEventListener = function(vElement, vType, vFunction) 
{
  if(vElement.attachEvent)
  {
    vElement.attachEvent("on" + vType, vFunction);
  } else
  {
    vElement.addEventListener(vType, vFunction, false);
  }
};


PageBot.prototype._removeEventListener = function(vElement, vType, vFunction) 
{
  if(vElement.detachEvent)
  {
    vElement.detachEvent("on" + vType, vFunction);
  } else
  {
    vElement.removeEventListener(vType, vFunction, false);
  }
};


PageBot.prototype._getWinWidth = function(w)
{
  var win = w||window;
  //if (win.document.body && win.document.body.clientWidth)
  if (browserVersion.isOpera)
  {
    return win.document.body.clientWidth;
  }
  else if (browserVersion.isSafari)
  {
    return win.innerWidth;
  }
  else
  {
    var doc = win.document;
    var width = doc.compatMode === "CSS1Compat" ? doc.documentElement.clientWidth : doc.body.clientWidth;
    return width; // no further correction currently
  }
};

/* ************************************************************************

qooxdoo - the new era of web development

http://qooxdoo.org

Copyright:
  2006-2007 1&1 Internet AG, Germany, http://www.1and1.org

License:
  LGPL: http://www.gnu.org/licenses/lgpl.html
  EPL: http://www.eclipse.org/org/documents/epl-v10.php
  See the LICENSE file in the project's top-level directory for details.

Authors:
  * Robert Zimmermann (rz)
  * Thomas Herchenroeder (thron7)

************************************************************************ */

/**
* Selenium Extension for testing Applications build with qooxdoo
*   see http://qooxdoo.org
*
* This extension covers the following commands to test applications build with qooxdoo:
*  1.) special click commands: "qxClick" and "qxClickAt"
*  2.) special qooxdoo element-locator "qx=" and "qxp="
*
* Supported Browsers:
*  - Mozilla-Family
*  - Internet Explorer
*
* qxClick and qxClickAt:
*  Both commands fire "mousedown" followed by "mouseup", as qooxdoo mostly does
*  not listen for "click".  Additionally these commands provide the possibility
*  to customize mouse-events, to do eg. a right-click or
*  click-with-shift-key-pressed, see below for details.
* Example:
* +----------+-----------------+------------------------------+
* |qxClick   | <any locator>   | button=right, shiftKey=true  |
* +----------+-----------------+------------------------------+
*
* qxClickAt also computes the X- and Y- coordinates of the target element.
*
* mouse-event-details (qxClick values):
*  button: the mouse-button to be pressed
*   - possible values: left, right, middle
*   - default value  : left
*  clientX and clientY: coordinates where the click is donne
*   - possible values: any positive integer
*   - default value  : 0
*  shiftKey, altKey, metaKey: additional modifier keys beeing pressed during click
*   - possible values: true, false
*   - default value  : false
*
*
* Special qooxdoo Locator:
*  As qooxdoo HTML consists mainly of div-elements, it is mostly difficult to
*  locate an distinct element with xpath (sometimes impossible).  If You have
*  access to the source of the AUT build with qooxdoo You can supply UserData
*  for the elements to interact with.
*  "qxp=": Additional, combined Locator like qxp=myDialog/buttonOK//XPATH-descendant
*
* Example:
*  customButton = new qx.ui.menu.MenuButton("Click Me", ...);
*  customButton.setUserData("customButton", "place here anything You want, e.g. selenium");
* Now this qooxdoo-button can be located (and clicked) like this:
* +----------+-----------------+--+
* |qxClick   | qx=customButton |  |
* +----------+-----------------+--+
* Note: The qooxdoo locator can be used with any selenium command, like
* +----------+-----------------+--+
* |mouseOver | qx=customButton |  |
* +----------+-----------------+--+
*
* The locator can also be used hierarchically.
* This is comfortable, if qooxdoo elements are reused in different locations.
* Example:
*  A OK-button is placed in a dialog box (and other dialog-boxes). And You
*  don't want to give the same button different UserData as it is still an
*  OK-button.  So apply an UserData for the dialog-box, e.g. "myDialog" and
*  name the button "buttonOK" Now this button can be located with:
*  qx=myDialog/buttonOK or e.g. qx=scndDialog/buttonOK
*
* dom-events reference: http://www.howtocreate.co.uk/tutorials/javascript/domevents
*
* EXTERNAL INTERFACES
*  Each user extension for Selenium uses interfaces from the Selenium runtime
*  environment, like the 'Selenium', 'PageBot', 'SeleniumError' and 'LOG' 
*  objects, or the 'triggerEvent' and 'getClientXY' functions. For more 
*  information, see the file 'user-extensions.js.sample' in the Selenium Core 
*  distribution.
*
* Changed to work with selenium 0.8.3
*
* Based on the orginal Selenium user extension for qooxdoo (version: 0.3)
* by Robert Zimmermann
*/

//-- Config section ------------------------------------------------
var initGetViewportByHand = true;
//-- Config end ----------------------------------------------------

Selenium.prototype.qx = {};

//***************************************************
//Handling of MouseEventParameters
//***************************************************
/**
* Helper to parse a param-String and provide access to the parameters with default-value handling
*
* @param customParameters string with name1=value1, name2=value2 whitespace will be ignored/stripped
* @param isIEevent boolean if true treat buttons IE-like, false treat it like all other user-agents do
*/
Selenium.prototype.qx.MouseEventParameters = function (customParameters)
{
this.customParameters = {};

if (customParameters && customParameters !== "")
{
 var paramPairs = customParameters.split(",");

 for (var i=0; i<paramPairs.length; i++)
 {
   var onePair = paramPairs[i];
   var nameAndValue = onePair.split("=");

   // rz: using String.trim from htmlutils.js of selenium to get rid of whitespace
   var name = new String(nameAndValue[0]).trim();
   var value = new String(nameAndValue[1]).trim();
   this.customParameters[name] = value;
 }
}
}

Selenium.prototype.qx.MouseEventParameters.MOUSE_BUTTON_MAPPING_IE =
{
"left"   : 1,
"right"  : 2,
"middle" : 4
};

Selenium.prototype.qx.MouseEventParameters.MOUSE_BUTTON_MAPPING_OTHER =
{
"left"   : 0,
"right"  : 2,
"middle" : 1
};


/**
* TODOC
*
* @type member
* @param buttonName {var} TODOC
* @return {var} TODOC
*/
Selenium.prototype.qx.MouseEventParameters.prototype.getButtonValue = function(buttonName)
{
if (document.createEventObject)
{
 LOG.debug("MouseEventParameters.prototype.getButtonValue - using IE Button-Mapping");
 return Selenium.prototype.qx.MouseEventParameters.MOUSE_BUTTON_MAPPING_IE[buttonName];
}
else
{
 LOG.debug("MouseEventParameters.prototype.getButtonValue - using OTHER Button-Mapping");
 return Selenium.prototype.qx.MouseEventParameters.MOUSE_BUTTON_MAPPING_OTHER[buttonName];
}
};


/**
* Returns an value if found for given paramName.
*  If not found, given defaultValue is returned
* 
* Type-conversion is donne for string, boolean and number automatically
*  based on type of the given defaultValue.
*
* @type member
* @param paramName {var} string name of parameter to search for
* @param defaultValue {var} <different types> default value to be returned, if no value is found
*            the type is important, see documentation above for details
* @return {var} TODOC
*/
Selenium.prototype.qx.MouseEventParameters.prototype.getParamValue = function(paramName, defaultValue)
{
if (this.customParameters[paramName])
{
 if (paramName == "button")
 {
   // special handling for mousebutton values (IE and not IE)
   return this.getButtonValue(this.customParameters["button"]);
 }
 else
 {
   // return converted type according to type of default value
   if (typeof defaultValue == "string")
   {
     // string
     return this.customParameters[paramName];
   }

   var strValue = this.customParameters[paramName];

   if (typeof defaultValue == "boolean")
   {
     // boolean
     return strValue === "true" ? true : false;
   }

   if (typeof defaultValue == "number")
   {
     // number
     return parseInt(strValue);
   }
 }
}
else
{
 // TODO: refactoring: resolve duplication
 if (paramName == "button")
 {
   // special handling for mousebutton values (IE and not IE)
   return this.getButtonValue(defaultValue);
 }
 else
 {
   return defaultValue;
 }
}
};

//***************************************************
//END: Handling of MouseEventParameters
//***************************************************
/**
* TODOC
*
* @type member
* @param buttonName {var} TODOC
* @return {var} TODOC
*/
Selenium.prototype.qx.triggerMouseEventQx = function (eventType, element, eventParamObject)
{
if (!eventParamObject)
{
 // this can only be, if the internal call-chain is wrong
 LOG.error("triggerMouseEventQx: eventParamObject is essential");
 return;
}

// use custom event details or default value
var button = eventParamObject.getParamValue("button", "left");
var bubbles = eventParamObject.getParamValue("bubbles", true);
var cancelable = eventParamObject.getParamValue("cancelable", true);
var detail = eventParamObject.getParamValue("detail", 1);
var screenX = eventParamObject.getParamValue("screenX", 0);
var screenY = eventParamObject.getParamValue("screenY", 0);
var clientX = eventParamObject.getParamValue("clientX", 0);
var clientY = eventParamObject.getParamValue("clientY", 0);
var ctrlKey = eventParamObject.getParamValue("ctrlKey", false);
var shiftKey = eventParamObject.getParamValue("shiftKey", false);
var altKey = eventParamObject.getParamValue("altKey", false);
var metaKey = eventParamObject.getParamValue("metaKey", false);

//    window     = null; //TODO: use correctly
/* for event dbugging
   LOG.debug(" * called triggerMouseEventQx, params:");
   LOG.debug("eventType=" + eventType);
   LOG.debug("element=" + element);
   LOG.debug("bubbles=" + bubbles);
   LOG.debug("cancelable=" + cancelable);
   LOG.debug("detail=" + detail);
   LOG.debug("screenX=" + screenX);
   LOG.debug("screenY=" + screenY);
   LOG.debug("clientX=" + clientX);
   LOG.debug("clientY=" + clientY);
   LOG.debug("ctrlKey=" + ctrlKey);
   LOG.debug("shiftKey=" + shiftKey);
   LOG.debug("altKey=" + altKey);
   LOG.debug("metaKey=" + metaKey);
   LOG.debug("button=" + button);
   LOG.debug(" * END triggerMouseEventQx, params:");
*/

var evt = null;

if (document.createEvent)
{
 LOG.debug("triggerMouseEventQx: default-user-agent-path");
 evt = document.createEvent("MouseEvents");

 // rz: has to be "initMouseEvent" otherwise parameters like clientX won't be set
 evt.initMouseEvent(eventType, bubbles, cancelable, document.defaultView, detail, screenX, screenY, clientX, clientY, ctrlKey, altKey, shiftKey, metaKey, button, null);
 element.dispatchEvent(evt);
}
else if (document.createEventObject)
{
 LOG.debug("triggerMouseEventQx: IE-path");
 evt = element.ownerDocument.createEventObject();

 evt.detail = detail;
 evt.screenX = screenX;
 evt.screenY = screenY;
 evt.clientX = clientX;
 evt.clientY = clientY;
 evt.ctrlKey = ctrlKey;
 evt.altKey = altKey;
 evt.shiftKey = shiftKey;
 evt.metaKey = metaKey;
 evt.button = button;
 evt.relatedTarget = null;

 element.fireEvent('on' + eventType, evt);
}
}


/**
* Clicks on a qooxdoo-element.
* mousedown, mouseup will be fired instead of only click (which is named execute in qooxdoo)
* 
* eventParams example: button=left|right|middle, clientX=300, shiftKey=true
*             for a full list of properties see "function Selenium.prototype.qx.triggerMouseEventQx"
*
* @type member
* @param locator {var} an element locator
* @param eventParams {var} additional parameter for the mouse-event to set. e.g. clientX.
*            if no eventParams are set, defaults will be: left-mousebutton, all keys false and all coordinates 0
* @return {void} 
*/
Selenium.prototype.doQxClick = function(locator, eventParams)
{
var element = this.page().findElement(locator);
this.clickElementQx(element, eventParams);
};


Selenium.prototype.doQxExecute = function(locator, eventParams)
{
var element = this.page().findElement(locator);
if (element.qx_Widget && element.qx_Widget.execute)
{
 element.qx_Widget.execute();
} else
{
 LOG.debug("qxExecute: Cannot invoke execute() on element: "+element);
}
};


Selenium.prototype.doGetViewport = function(locator, eventParams)
{
var docelem = this.page().findElement("dom=document"); // evtl. document.body
//var win     = docelem.parentWindow? docelem.parentWindow : docelem.defaultView;
var win     = selenium.browserbot.getCurrentWindow();

// clear old geom string
if (storedVars && storedVars['ViewportStr']) {
 delete storedVars['ViewportStr'];
}

// event handler to capture coordinates
function eh(e)
{
 // get coordinates
 var mouseX;
 var mouseY; // relat. mouse coords
 // this is from quirksmode.org
 if (e.pageX || e.pageY)
 {
   mouseX = e.pageX;
   mouseY = e.pageY;
   LOG.debug("pageX, pageY: "+mouseX+"'"+mouseY);
 } else if (e.clientX || e.clientY)
 {
   mouseX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft; 
   mouseY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
   LOG.debug("e.clientX,e.clientY,document.body.scrollLeft,document.documentElement.scrollLeft,document.body.scrollTop,document.documentElement.scrollTop:\n"+
             e.clientX+','+e.clientY+','+document.body.scrollLeft+','+document.documentElement.scrollLeft+','+document.body.scrollTop+','+document.documentElement.scrollTop);
 } else
 {
   mouseX = 0;
   mouseY = 0;
   LOG.debug("no X,Y coords from event object");
 }
 LOG.debug("e.screenX,e.screenY: "+e.screenX+','+e.screenY);
 var originX = e.screenX - mouseX;
 var originY = e.screenY - mouseY;
 width   = PageBot.prototype._getWinWidth(win);
 height  = PageBot.prototype._getWinHeight(win);
 var geom = width+'x'+height+'+'+originX+'+'+originY;
 LOG.info("Page geometry (WxH+X+Y): "+ geom);
 // write to var
 if (! storedVars)
 {
   storedVars = {};
 }
 storedVars['ViewportStr'] = geom;
 // de-register myself
 PageBot.prototype._removeEventListener(docelem, "click", eh);
};

// register handler
PageBot.prototype._addEventListener(docelem, "click", eh);

// fire a mouse event at 0,0
if (initGetViewportByHand) {
 //alert("Please click anywhere in the document"); // destroys event handling!!!
} else {
 // this is essentially useless since the resulting mouse event lacks screenX
 // and screenY coords
 this.doQxClickAt("dom=document", "clientX=0,clientY=0");  // 0,0
}
/*
var eventParamObject = new Selenium.prototype.qx.MouseEventParameters();
this.browserbot.triggerMouseEventQx("click", docelem,eventParamObject);
*/

};


/**
* Clicks on a qooxdoo-element.
* mousedown, mouseup will be fired instead of only click
* additionaly to doQxClick the x-/y-coordinates of located element will be determined.
* TODO: implement it like doFooAt, where additional coordinates will be added to the element-coords
* 
* eventParams example: button=left|right|middle, clientX=300, shiftKey=true
*             for a full list of properties see "function Selenium.prototype.qx.triggerMouseEventQx"
*
* @type member
* @param locator {var} an element locator
* @param eventParams {var} additional parameter for the mouse-event to set. e.g. clientX.
*            if no eventParams are set, defaults will be: left mousebutton, all keys false and all coordinates 0
* @return {void} 
*/
Selenium.prototype.doQxClickAt = function(locator, eventParams)
{
var element = this.page().findElement(locator);
var coordsXY = getClientXY(element);
LOG.debug("computed coords: X=" + coordsXY[0] + " Y=" + coordsXY[1]);

// TODO: very dirty no checking, maybe refactoring needed to get doQxClick and doQxClickAt to work smoothly together.
var newEventParamString = eventParams + ",clientX=" + coordsXY[0] + ",clientY=" + coordsXY[1];
LOG.debug("newEventParamString=" + newEventParamString);
this.clickElementQx(element, newEventParamString);
};


/**
* TODOC
*
* @type member
* @param element {var} TODOC
* @param eventParamString {var} TODOC
* @return {void} 
*/
Selenium.prototype.clickElementQx = function(element, eventParamString)
{
var additionalParamsForClick = new Selenium.prototype.qx.MouseEventParameters(eventParamString);

triggerEvent(element, 'focus', false);
Selenium.prototype.qx.triggerMouseEventQx('mouseover', element, additionalParamsForClick);
Selenium.prototype.qx.triggerMouseEventQx('mousedown', element, additionalParamsForClick);
Selenium.prototype.qx.triggerMouseEventQx('mouseup', element, additionalParamsForClick);
Selenium.prototype.qx.triggerMouseEventQx('click', element, additionalParamsForClick);
// do not blur or mouseout as additional events won't be fired correctly
//FIXME: include original "click" functionality
};

/**
* Check wheather an qooxdoo Element is enabled or not
*
* @type member
* @param locator {var} an element locator
* @return {var} TODOC
* @throws TODOC
*/
Selenium.prototype.isQxEnabled = function(locator)
{
LOG.debug("isQxEnabled: locator.substr(0,3)=" + locator.substr(0, 3));

if (locator.substr(0, 2) === "qx")
{
 var qxxLocator;

 if (locator.substr(0, 3) === "qx=") {
   qxxLocator = "qxx=" + locator.substr(3, locator.length - 1);
 } else if (locator.substr(0, 4) === "qxp=") {
   throw new SeleniumError("NotImplemented: isQxEnabled for qxp Locator not yet implemented.");
 } else {
   throw new SeleniumError("Error: Bad qooxdoo-Locator-Syntax for locator: " + locator);
 }

 LOG.debug("isQxEnabled: qxxLocator=" + qxxLocator);
 var qxObject = this.page().findElement(qxxLocator);
 if (qxObject) {
   while (qxObject.getEnabled() === "inherit") {
     qxObject = qxObject.getParent();
   }
   return qxObject.getEnabled();
 } else {
   throw new SeleniumError("No such object: " + locator)
 }
}
else
{
 throw new SeleniumError("Error: No qooxdoo-Locator given. This command only runs with qooxdoo-Locators");
}
};

//****************************************
//qooxdoo-locator (qx=) and special (qxx=)
//****************************************
/**
* Finds an qooxdoo-Object (!) identified by qooxdoo userData attribute
*  Note: Here the Selenium locator abstraction is used to get an js-object _not_ an DOM-element
* 
* locator syntax: qxx=oneId/childId1/childId2
*   note: childs can also be found directly if their qooxdoo-Id is unique in the current application state
*         if multiple id's exist in qooxdoo, the first found is used!
* trailing and preceeding "/" are invalid (like qx=/el1/el2/) and will be ignored
* also surplus "/" are ignored (like qx=el1//el2)
*
* @type member
* @param qxLocator {var} TODOC
* @param inDocument {var} TODOC
* @param inWindow {var} TODOC
* @return {var} TODOC
*/
PageBot.prototype.locateElementByQxx = function(qxLocator, inDocument, inWindow)
{
LOG.info("Locate qooxdoo-Object by qooxdoo-UserData-Locator=" + qxLocator + ", inDocument=" + inDocument + ", inWindow=" + inWindow.location.href);

var qxObject = this._findQxObjectInWindow(qxLocator, inWindow);

if (qxObject) {
 return qxObject;
}
};


/**
* Finds an element identified by qooxdoo userData attribute
* 
* locator syntax: qx=oneId/childId1/childId2
*   note: childs can also be found directly if their qooxdoo-Id is unique in the current application state
*         if multiple id's exist in qooxdoo, the first found is used!
* trailing and preceeding "/" are invalid (like qx=/el1/el2/) and will be ignored
* also surplus "/" are ignored (like qx=el1//el2)
*
* @type member
* @param qxLocator {var} TODOC
* @param inDocument {var} TODOC
* @param inWindow {var} TODOC
* @return {var} TODOC
*/
PageBot.prototype.locateElementByQx = function(qxLocator, inDocument, inWindow)
{
LOG.info("Locate Element by qooxdoo-UserData-Locator=" + qxLocator + ", inDocument=" + inDocument + ", inWindow=" + inWindow.location.href);

var qxObject = this._findQxObjectInWindow(qxLocator, inWindow);

if (qxObject) {
 return qxObject.getElement();
}
};


/**
* Finds an element identified by qooxdoo userData attribute, followed by a xpath expression
* 
* locator syntax: qxp=oneId/childId1/childId2//xpath
* 
* TODO: Test this addition
* credits: Sebastian Dauss
*
* @type member
* @param qxLocator {var} TODOC
* @param inDocument {var} TODOC
* @param inWindow {var} TODOC
* @return {null | var} TODOC
* @throws TODOC
*/
PageBot.prototype.locateElementByQxp = function(qxLocator, inDocument, inWindow)
{
LOG.info("Locate Element by qooxdoo-UserData-XPath-Locator=" + qxLocator + ", inDocument=" + inDocument + ", inWindow=" + inWindow.location.href);

var locatorParts = qxLocator.split('//');

if (locatorParts.length !== 2) {
 throw new SeleniumError("Error: wrong QXP locator syntax. need: qx1/qx2/.../qxn//xpath");
}

var qxPart = locatorParts[0];
var xpathPart = locatorParts[1];

if (!qxPart) {
 throw new SeleniumError("Error: wrong QXP locator syntax, qx-Part must not be empty. hint: use xpath locator instead");
}

if (!xpathPart) {
 throw new SeleniumError("Error: wrong QXP locator syntax, xpath-Part must not be empty. hint: use qx locator instead");
}

var qxObject = this._findQxObjectInWindow(qxPart, inWindow);

if (!qxObject) {
 return null;
}

var qxElement = qxObject.getElement();  

var resultElement;
if (this.locateElementByXPath){

 //Selenium 1.0: Use public function locateElementByXPath
 resultElement =       this.locateElementByXPath('descendant-or-self::node()/'+xpathPart, qxElement, inWindow);
} else {
 //Selenium 0.9.2: Use internal function _findElementUsingFullXPath
 resultElement = this._findElementUsingFullXPath('descendant-or-self::node()/'+xpathPart, qxElement, inWindow);
}
 
return resultElement;
};


/**
* Finds an element identified by qooxdoo object hierarchy, down from the Application object
* 
* locator syntax: qxh=firstLevelChild/secondLevelChild/thirdLevelChild
* 
*    where on each level the child can be identified by:
*    - an identifier (which will be taken as a literal object member of the
*      parent)
*    - a special identifier starting with "qx." (this will be taken as a
*      qooxdoo class signifying the child, e.g. "qx.ui.form.Button") [TODO]
*    - "child[n]" (where n signifies the nth child of the current parent) [TODO]
*    -
*
* @type member
* @param qxLocator {var} TODOC
* @param inDocument {var} TODOC
* @param inWindow {var} TODOC
* @return {var | null} TODOC
*/
PageBot.prototype.locateElementByQxh = function(qxLocator, inDocument, inWindow)
{
LOG.info("Locate Element by qooxdoo-Object-Hierarchy-Locator=" + qxLocator + ", inDocument=" + inDocument + ", inWindow=" + inWindow.location.href);

var qxObject = this._findQxObjectInWindowQxh(qxLocator, inWindow);

if (qxObject) {
 return qxObject.getElement();
} else {
 return null;
}
};

/**
* Returns the client document instance or null if Init.getApplication() returned null. 
* Reason is that qooxdoo 0.7 relies on the application being set when the client document
* is accessed  
*
* @type member
* @param inWindow {var} window too get client document for
* @return {qx.ui.core.ClientDocument | null} document or null
*/
PageBot.prototype._getClientDocument = function(inWindow){

//In qooxdoo 0.7, qx.ui.core.ClientDocument.getInstance() triggers the autoflush
//mechanism in qooxdoo. This will cause the rendering queues to be flushed.
//If the application is not set yet, Widget.flushGlobalQueues will fail.
//
//So prevent access to the client document until application is set
if ((inWindow != null)
    && (inWindow.qx != null)
    && (inWindow.qx.core.Init != null)
    && (inWindow.qx.core.Init.getInstance() != null)      
    && (inWindow.qx.core.Init.getInstance().getApplication() != null)
  ){
 return inWindow.qx.ui.core.ClientDocument.getInstance();
} else{
 return null;
}
}


/**
* TODOC
*
* @type member
* @param qxLocator {var} TODOC
* @param inWindow {var} TODOC
* @return {null | var} TODOC
* @throws TODOC
*/
PageBot.prototype._findQxObjectInWindowQxh = function(qxLocator, inWindow)
{
if (!inWindow) {
 throw new Error("No AUT window. Internal Error.");
}

var qxResultObject = null;

// the AUT window must contain the qx-Object
var qxAppRoot;

if (inWindow.qx)
{
 LOG.debug("qxLocator: qooxdoo seems to be present in AUT window. Try to get the Instance");
 // check for object space spec
 if (qxLocator.match('^app:')) 
 {
   qxAppRoot = inWindow.qx.core.Init.getInstance().getApplication();
 } else 
 {
   qxAppRoot = this._getClientDocument(inWindow);
   if (qxAppRoot == null){
     LOG.debug("qx-Locator: Cannot access Init.getApplication() (yet), cannot search. inWindow=" + inWindow.location.href + ", inWindow.qx=" + inWindow.qx);
     return null;
   }
 }
 this._globalQxObject = inWindow.qx;
}

else
{
 LOG.debug("qx-Locator: qx-Object not defined, object not found. inWindow=" + inWindow.location.href + ", inWindow.qx=" + inWindow.qx);

 // do not throw here, as if the locator fails in the first place selenium will call this
 // again with all frames (and windows?) which won't result in "element not found" but in
 // qooxdoo not beeing availabel.
 return null;
}

LOG.debug("qxLocator All basic checks passed.");

// treat qxLocator
qxLocator = qxLocator.replace(/^[a-z]+:/i,"");  // remove optional object space spec (settled above)
var qxhParts = qxLocator.split('/');

try {
 qxResultObject = this._searchQxObjectByQxHierarchy(qxAppRoot, qxhParts);
}
catch(e)
{
 if (e.a instanceof Array)
 {
   // throw new SeleniumError("qooxdoo-Element " + e.join('/') + " not found");
   LOG.debug("Qxh Locator: Could not resolve last element of: " + e.a.join('/'));

   // return null; // for now just return null
   throw e;
 }
 else
 {  // re-raise
   throw e;
 }
}

return qxResultObject;
};


/**
* TODOC
*
* @type member
* @param qxLocator {var} TODOC
* @param inWindow {var} TODOC
* @return {null | var} TODOC
* @throws TODOC
*/
PageBot.prototype._findQxObjectInWindow = function(qxLocator, inWindow)
{
if (!inWindow) {
 throw new Error("No AUT window. Internal Error.");
}

var qxResultObject;

// the AUT window must contain the qx-Object
if (inWindow.qx)
{
 LOG.debug("qxLocator: qooxdoo seems to be present in AUT window. Try to get the Instance using (qx.ui.core.ClientDocument.getInstance())");
 qxResultObject = this._getClientDocument(inWindow);
 if (qxResultObject == null){
   LOG.debug("qx-Locator: Cannot access Init.getApplication() (yet), cannot search. inWindow=" + inWindow.location.href + ", inWindow.qx=" + inWindow.qx);
   return null;
 }
}
else
{
 LOG.debug("qx-Locator: qx-Object not defined, object not found. inWindow=" + inWindow.location.href + ", inWindow.qx=" + inWindow.qx);

 // do not throw here, as if the locator fails in the first place selenium will call this
 // again with all frames (and windows?) which won't result in "element not found" but in
 // qooxdoo not beeing availabel.
 return null;
}

LOG.debug("qxLocator All basic checks passed.");

var qxPathList = qxLocator.split("/");

for (var i=0; i<qxPathList.length; i++)
{
 // ignore additional "/"
 if (qxPathList[i] !== "")
 {
   if (!qxResultObject)
   {
     LOG.error("qx-locator path-element can not be searched. invalid qooxdoo object. path-element=" + qxPathList[i]);
     return null;
   }

   qxResultObject = this._searchQxObjectByQxUserData(qxResultObject, qxPathList[i]);
 }
}

if (qxResultObject)
{
 LOG.debug("qxResultObject=" + qxResultObject + ", element=" + qxResultObject.getElement());
 return qxResultObject;
}
else
{
 LOG.error("qx-locator: element not found for locator: qx-locator=" + qxLocator);
 return null;
}
};


/**
* TODOC
*
* @type member
* @param obj {Object} TODOC
* @param userDataSearchString {var} TODOC
* @return {null | void | var} TODOC
*/
PageBot.prototype._searchQxObjectByQxUserData = function(obj, userDataSearchString)
{
if (!obj) {
 return null;
}

if (!obj.getChildren) {
 return;
}

var children = obj.getChildren();

if (!children || children.length === 0) {
 return;
}

for (var i=0; i<children.length; i++)
{
 var child = children[i];
 var description = child.getUserData(userDataSearchString);

 if (description)
 {
   LOG.info("qx-widget found for userDataSearchString=" + userDataSearchString + " - returning Object=" + child);
   return child;
 }
 else
 {
   var result = this._searchQxObjectByQxUserData(child, userDataSearchString);

   if (result) {
     return result;
   }
 }
}

return null;
};


PageBot.prototype.qx = {};  // create qx name space
//some regexps, to safe stack space
PageBot.prototype.qx.IDENTIFIER = new RegExp('^[a-z$][a-z0-9_\.$]*$', 'i');
PageBot.prototype.qx.NTHCHILD = /^child\[\d+\]$/i;
PageBot.prototype.qx.ATTRIB = /^\[.*\]$/;



/**
* TODOC
*
* @type member
* @param root {var} TODOC
* @param path {var} TODOC
* @return {null | Element | var} TODOC
* @throws TODOC
*/
PageBot.prototype._searchQxObjectByQxHierarchy = function(root, path)
{
// recursive traverse the path
// currently, we only return single elements, not sets of matching elements
if (path.length == 0) {
 return null;
}
if (typeof(root) != "object") { // can only traverse (qooxdoo) objects
 return null;
}
if (root == null) {
 throw new SeleniumError("QxhPath: Cannot determine descendant from null root for: " + path);
}

var el = null;  // the yet to find current element
var step = path[0];  // the current part of the QPath expression
var npath = path.slice(1); // new path - rest of path

LOG.debug("Qxh Locator: Inspecting current step: " + step);

// get a suitable element from the current step, dispatching on step type
if (step == '*')                 // this is like '//' in XPath
{
 // this means we have to recursively look for rest of path among descendants
 LOG.debug("Qxh Locator: ... identified as wildcard (*) step");
 var res = null;

 // first check if current element matches already
 if (npath == 0)
 {
   // no more location specifier, * matches all, so return current element
   return root;
 }
 else
 {
   // there is something to match against
   try
   {
     LOG.debug("Qxh Locator: recursing with root: "+root+", path: "+npath.join('/'));
     res = this._searchQxObjectByQxHierarchy(root, npath);
   }
   catch (e)
   {
     if (e.a instanceof Array)
     {
       // it's an exception thrown by myself - just continue search
       ;
     }
     else 
     {
       throw e;
     }
   }
 }
 // check what we've got - can't be null
 if (res != null)
 {
   return res;
 }

 // then recurse with children, using original path
 var childs = this._getQxNodeDescendants(root);
 
 for (var i=0; i<childs.length; i++)
 {
   try
   {
     LOG.debug("Qxh Locator: recursing with root: "+childs[i]+", path: "+path.join('/'));
     res = this._searchQxObjectByQxHierarchy(childs[i], path);
   }
   catch (e)
   {
     if (e.a instanceof Array)
     {
       // it's an exception thrown by a descendant - just continue search
       continue;
     }
     else 
     {
       throw e;
     }
   }
   // when we reach this we have a hit
   return res;
 }

 // let's see how we came out of the loop
 // all recursion is already done, so we can terminate here
 if (res == null)
 {
   var e = new SeleniumError("Qxh Locator: Error resolving qxh path");
   e.a = [ step ]; // since we lost the e from deeper recursions just report current
   throw e;
 }
 else 
 {
   return res; // this should be superfluous
 }
}

else if (step.match(this.qx.IDENTIFIER))
{
 if (step.indexOf('qx.') != 0)  // 'foo' format
 {
   LOG.debug("Qxh Locator: ... identified as general identifier");
   el = this._getQxElementFromStep1(root, step);
 }
 else
 {  // 'qx....' format
   LOG.debug("Qxh Locator: ... identified as qooxdoo class name");
   el = this._getQxElementFromStep2(root, step);
 }
}

else if (step.match(this.qx.NTHCHILD))  // 'child[n]' format
{
 LOG.debug("Qxh Locator: ... identified as indexed child");
 el = this._getQxElementFromStep3(root, step);
}

else if (step.match(this.qx.ATTRIB))  // '[@..=...]' format
{
 LOG.debug("Qxh Locator: ... identified as attribute specifier");
 el = this._getQxElementFromStep4(root, step);
}

else  // unknown step format
{
 throw new SeleniumError("QPath: Illegal step: " + step);
}

// check result
if (el == null)
{
 var e = new SeleniumError("Qxh Locator: Error resolving qxh path");
 e.a = [ step ];
 throw e;
}

// recurse
if (npath.length == 0) {
 LOG.debug("Qxh Locator: Terminating search, found match; last step :"+step+", element: "+el);
 return el;
}
else
{
 // basically we tail recurse, but catch exceptions
 try {
   LOG.debug("Qxh Locator: tail-recursing with root: "+el+"(fixed step: '"+step+"'), path: "+npath.join('/'));
   var res = this._searchQxObjectByQxHierarchy(el, npath);
 }
 catch(e)
 {
   if (e.a instanceof Array)
   {
     // prepend the current step
     e.a.unshift(step);
     LOG.debug("Qxh Locator: ... nothing found in this branch; going up");
     throw e;
   }
   else
   {  // re-raise
     throw e;
   }
 }

 return res;
}
};  // _searchQxObjectByQxHierarchy()


/**
* 'button1' (from 'w.button1') - step specifier
*
* @type member
* @param root {var} TODOC
* @param step {var} TODOC
* @return {var | null} TODOC
*/
PageBot.prototype._getQxElementFromStep1 = function(root, step)
{
// find an object member of root with name 'step'
LOG.debug("Qxh Locator: in _getQxElementFromStep1");
var member;

for (member in root)
{
 if (member == step) {
   return root[member];
 }
}

return null;
};


/**
* 'qx.ui.form.Button' - step specifier
*
* @type member
* @param root {var} TODOC
* @param qxclass {var} TODOC
* @return {var | null} TODOC
*/
PageBot.prototype._getQxElementFromStep2 = function(root, qxclass)
{
// find a child of root with qooxdoo type 'qxclass'
LOG.debug("Qxh Locator: in _getQxElementFromStep2");
var childs;
var curr;

// need to get to the global 'qx' object
if (this._globalQxObject) {
 var qx = this._globalQxObject;
 var myClass = qx.Class.getByName(qxclass);
} else {
 throw new SeleniumError("Qxh Locator: Need global qx object to search by attribute");
}

childs = this._getQxNodeDescendants(root);

for (var i=0; i<childs.length; i++)
{
 curr = childs[i];

 if (curr instanceof myClass) {
   return curr;
 }
}

return null;
};


/**
* 'child[3]' - step specifier
*
* @type member
* @param root {var} TODOC
* @param childspec {var} TODOC
* @return {null | var} TODOC
*/
PageBot.prototype._getQxElementFromStep3 = function(root, childspec)
{
// find a child of root by index
LOG.debug("Qxh Locator: in _getQxElementFromStep3");
var childs;
var idx;
var m;

// extract child index
m = /child\[(\d+)\]/i.exec(childspec);

if ((m instanceof Array) && m.length > 1) {
 idx = m[1];
} else {
 return null;
}

childs = this._getQxNodeDescendants(root);

if (idx < 0 || idx >= childs.length) {
 return null;
} else {
 return childs[idx];
}
};


/**
* '[@label="hugo"]' - step specifier
*
* @type member
* @param root {var} TODOC
* @param attribspec {var} TODOC
* @return {null | var} TODOC
* @throws TODOC
*/
PageBot.prototype._getQxElementFromStep4 = function(root, attribspec)
{
// find a child of root by attribute
LOG.debug("Qxh Locator: in _getQxElementFromStep4");
var childs;
var attrib;
var attval;
var rattval;
var actobj;
var m;


// need to get to the global 'qx' object
if (this._globalQxObject) {
 var qx = this._globalQxObject;
} else {
 throw new SeleniumError("Qxh Locator: Need global qx object to search by attribute");
}

// extract attribute and value
m = /\[@([^=]+)(?:=(.+))?\]$/.exec(attribspec);

if ((m instanceof Array) && m.length > 1)
{
 LOG.debug("Qxh Locator: _getQxElementFromStep4: parsed spec into: "+m);
 attrib = m[1];
 if (m.length > 2 && m[2]!=null)
 {
   attval = m[2];

   // strip possible quotes from attval
   if (attval.match(/^['"].*['"]$/)) {
     attval = attval.slice(1, attval.length - 1);
   }

   // it's nice to match against regexp's
   rattval = new RegExp(attval);
     
 }
}
else
{
 return null;
}

if (attval == null) // no compare value -> attrib on root must contain obj ref
{
 actobj = this.qx._getGeneralProperty(root, attrib, qx);
 if (typeof(actobj) == "object")
 {
   return actobj; // only return an obj ref
 } else 
 {
   return null;
 }
}

childs = this._getQxNodeDescendants(root);

for (var i=0; i<childs.length; i++)
{
 // For every child, we check various ways where it might match with the step
 // specifier (generally using regexp match to compare strings)
 actobj = childs[i];

 // check properties first
 // var qxclass = qx.Class.getByName(actobj.classname);
 if (actobj.constructor)
 {
   var hasProp = qx.Class.hasProperty(actobj.constructor, attrib);  // see qx.Class API

   if (hasProp)
   {
     var currval = actobj.get(attrib);
     LOG.debug("Qxh Locator: Attribute Step: Checking for qooxdoo property ('" + attrib + "' is: " + currval + ")");

     if (currval && currval.match(rattval)) {
       return actobj;
     }
   }
 }

 // then, check normal JS attribs
 if ((attrib in actobj) && ((String(actobj[attrib])).match(rattval)))
 {
   LOG.debug("Qxh Locator: Attribute Step: Checking for JS object property");
   return actobj;
 }

 /*
 // last, if it is a @label attrib, try check the label of the widget
 // [this might be superfluous, since it seems that 'getLabel()' is covered
 // by 'get("label")' in the property section above]
 if (/^label$/i.exec(attrib))
 {
   LOG.debug("Qxh Locator: Attribute Step: Checking for qooxdoo widget label");

   // try getLabel() method
   if (actobj.getLabel)
   {
     if ((actobj.getLabel()).match(rattval)) {
       return actobj;
     }
   }
 }
 */
 else
 {
   LOG.debug("Qxh Locator: Attribute Step: No match for current child");
 }
}

return null;
};  // _getQxElementFromStep4()


/**
* using different approaches to locate a node's direct descendants (children of
* some kind)
*
* @type member
* @param node {Node} TODOC
* @return {var} TODOC
*/
PageBot.prototype._getQxNodeDescendants = function(node)
{
var descArr = [];
var c;

// check TreeFolder items
if (node.getItems) {
 LOG.debug("getQxNodeDescendants: using getItems() to retrieve descendants");
 descArr = descArr.concat(node.getItems());
}

// check widget children (built with w.add())
else if (node.getChildren) {
 c = node.getChildren();
 LOG.debug("getQxNodeDescendants: using getChildren() to retrieve descendants");
     // +" (got: "+ (c.length? c.length: 0)+")");
 descArr = descArr.concat(c);
}

// use JS object members
else
{
 LOG.debug("getQxNodeDescendants: using JS properties to retrieve descendants");
 for (var m in node) {
   descArr.push(node[m]);
 }
}

// only select useful subnodes (only objects, no circular refs, etc.)
// TODO: circular refs which are *not* immediate!
var descArr1 = [];
for (var i=0; i<descArr.length; i++)
{
 var curr = descArr[i];
 if ((typeof(curr) == "object") && (curr != node) && (curr != null))
 {
   descArr1.push(descArr[i]);
 }
}

LOG.debug("getQxNodeDescendants: returning for node : "+node+" immediate children: "+descArr1);
return descArr1;
};  // _getQxNodeDescendants()


PageBot.prototype.qx._getGeneralProperty = function(actobj, attrib, qx)
{
// check properties first
// var qxclass = qx.Class.getByName(actobj.classname);
if (actobj.constructor)
{
 var hasProp = qx.Class.hasProperty(actobj.constructor, attrib);  // see qx.Class API

 if (hasProp)
 {
   //LOG.debug("Qxh Locator: Attribute Step: Checking for qooxdoo property ('" + attrib + "' is: " + currval + ")");
   var currval = actobj.get(attrib);
   return currval;
 }
}

// then, check normal JS attribs
if (attrib in actobj)
{
 //LOG.debug("Qxh Locator: Attribute Step: Checking for JS object property");
 return actobj[attrib];
}

/*
// last, if it is a @label attrib, try check the label of the widget
// [this might be superfluous, since it seems that 'getLabel()' is covered
// by 'get("label")' in the property section above]
if (/^label$/i.exec(attrib))
{
 LOG.debug("Qxh Locator: Attribute Step: Checking for qooxdoo widget label");

 // try getLabel() method
 if (actobj.getLabel)
 {
   if ((actobj.getLabel()).match(rattval)) {
     return actobj;
   }
 }
}
*/
return null;
};


//code from qx.html.EventRegistration.js

PageBot.prototype._addEventListener = function(vElement, vType, vFunction) 
{
if(vElement.attachEvent)
{
 vElement.attachEvent("on" + vType, vFunction);
} else
{
 vElement.addEventListener(vType, vFunction, false);
}
};


PageBot.prototype._removeEventListener = function(vElement, vType, vFunction) 
{
if(vElement.detachEvent)
{
 vElement.detachEvent("on" + vType, vFunction);
} else
{
 vElement.removeEventListener(vType, vFunction, false);
}
};


PageBot.prototype._getWinWidth = function(w)
{
var win = w||window;
//if (win.document.body && win.document.body.clientWidth)
if (browserVersion.isOpera)
{
 return win.document.body.clientWidth;
}
else if (browserVersion.isSafari)
{
 return win.innerWidth;
}
else
{
 var doc = win.document;
 var width = doc.compatMode === "CSS1Compat" ? doc.documentElement.clientWidth : doc.body.clientWidth;
 return width; // no further correction currently
}
};


PageBot.prototype._getWinHeight = function(w)
{
var win = w||window;
if (browserVersion.isOpera)
{
 return win.document.body.clientHeight;
}
else if (browserVersion.isSafari)
{
 return win.innerHeight;
}
else
{
 var doc = win.document;
 var height = doc.compatMode === "CSS1Compat" ? doc.documentElement.clientHeight : doc.body.clientHeight;
 return height; // no further correction currently
}
};

PageBot.prototype._getWinHeight = function(w)
{
  var win = w||window;
  if (browserVersion.isOpera)
  {
    return win.document.body.clientHeight;
  }
  else if (browserVersion.isSafari)
  {
    return win.innerHeight;
  }
  else
  {
    var doc = win.document;
    var height = doc.compatMode === "CSS1Compat" ? doc.documentElement.clientHeight : doc.body.clientHeight;
    return height; // no further correction currently
  }
};
