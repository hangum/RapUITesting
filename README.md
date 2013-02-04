RapUITesting
============

http://wiki.eclipse.org/RapUITesting

##. summary
###. Server Start
1. com.hangum.tadpole.rdb.core.test/server/start-selenium-server.cmd

java -jar selenium-server-standalone-2.28.0.jar -userExtensions user-extensions.js	

###. Test Application
1. com.hangum.tadpole.test.example/org.eclpse.rap.demo.ui.test/TestApp.java
2. Add VMArgument : -Dorg.eclipse.rwt.enableUITests=true

###. JUnit Test Application
1.com.hangum.tadpole.rdb.core.test/testapp/RapTestCase.java
