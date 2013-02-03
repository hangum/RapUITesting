package org.eclipse.rap.demo.ui.tests;

import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.rwt.lifecycle.IEntryPoint;
import org.eclipse.rwt.lifecycle.WidgetUtil;
import org.eclipse.swt.SWT;
import org.eclipse.swt.events.SelectionAdapter;
import org.eclipse.swt.events.SelectionEvent;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Button;
import org.eclipse.swt.widgets.Display;
import org.eclipse.swt.widgets.Shell;

public class TestApp implements IEntryPoint {

	public int createUI() {
		Display d = new Display();
		final Shell s = new Shell(d, SWT.SHELL_TRIM);
		s.setLayout(new GridLayout());
		s.setText("App Title");
		final Button b1 = new Button(s, SWT.PUSH);
		b1.setText("Before");
		b1.addSelectionListener(new SelectionAdapter() {
			public void widgetSelected(SelectionEvent e) {
//				MessageDialog.openInformation(null, "MessageBox", "Changing the button text now...");
				b1.setText("After");
			}
		});
		b1.setData(WidgetUtil.CUSTOM_WIDGET_ID, "myButton");
		s.pack();
		s.open();
//		while (!s.isDisposed()) {
//			if (!d.readAndDispatch())
//				d.sleep();
//		}
		return 0;
	}

}