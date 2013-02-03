package org.eclipse.rap.demo.ui.tests;

import com.thoughtworks.selenium.CommandProcessor;
import com.thoughtworks.selenium.DefaultSelenium;



public class RAPSelenium extends DefaultSelenium {

	public RAPSelenium(CommandProcessor processor) {
		super(processor);
	}

	public RAPSelenium(String serverHost, int serverPort,
			String browserStartCommand, String browserURL) {
		super(serverHost, serverPort, browserStartCommand, browserURL);
	}

	public void click(String locator) {
		commandProcessor.doCommand("qxClickAt", new String[] { "id=" + locator});
	}
	
	public String getText(String locator) {
		return super.getText("id=" + locator);
	}
	
	public void waitForElementPresent(String locator) {
		for (int second = 0;; second++) {
			if (second >= 60) System.out.println("timeout");
			try { if (isElementPresent("id=" + locator)) break; } catch (Exception e) {}
			try {
				Thread.sleep(1000);
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
	}
	
	public void clickAndWait(String locator) {
		click(locator);
		try {
			Thread.sleep(1*1000);
		} catch (InterruptedException e) {
			e.printStackTrace();
		}
	}
}