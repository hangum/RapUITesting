package testapp;

import org.eclipse.rap.demo.ui.tests.RAPSelenium;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;

public class RapTestCase {

	private RAPSelenium sel;

	private static final String BUTTON = "myButton";

	@Before
	public void setUp() throws Exception {
		sel = new RAPSelenium("localhost", 4444,
				"*firefox C:/Program Files (x86)/Mozilla Firefox/firefox.exe",
				"http://127.0.0.1:10080/rap"); //change to working path to you firefox and test application.  
		sel.start();
	}

	@Test
	public void testButton() {
		sel.open("http://127.0.0.1:10080/rap");//?startup=TestApp.entrypoint1"); //change it to feet your configuration (url, name and port). 

		sel.waitForElementPresent(BUTTON);

		// checking button
		Assert.assertEquals("Before", sel.getText(BUTTON));

		// checking message dialog
		sel.clickAndWait(BUTTON);
		
		//  // Close the popup to view go back to the button
//		sel.clickAndWait("w10"); // was w10 for me, check the Id of yours. You can alternativly set a specific id for the popup validation button.
		// check button afterwards
		Assert.assertEquals("After", sel.getText(BUTTON));
	}

	@After
	public void AfterClass() throws Exception {
		sel.stop();
	}
}