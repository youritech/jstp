# Applications and Application Providers

## Interface: IApplication

### application.name

An application object must have a String property called `name` that is equal
to the name of the application.

### application.callMethod(connection, interfaceName, methodName, args)

* `connection` {[Connection](connection.md#class-connection)} connection that
  received a call packet.
* `interfaceName` {String} name of an interface.
* `methodName` {String} name of a method.
* `args` {Array} array of method arguments (there is always at least one item
  in the array and the last one is always a callback).

Calls a method of the application.

If the specified interface (or method) does not exist, then `callMethod` should
invoke the callback with
[`ERR_INTERFACE_NOT_FOUND`](errors.md#jstperr_interface_not_found) (or
[`ERR_METHOD_NOT_FOUND`](errors.md#jstperr_method_not_found)) or just throw a
corresponding [`RemoteError`](errors.md#class-remoteerror) instance.

If an error occures, the method can pass any of the following to the callback:

* a [`RemoteError`](errors.md#class-remote-error) instance;
* an `Error` instance;
* a number
* a string.

See the [Errors section](errors.md) for more info.

### application.getMethods(interfaceName)

* `interfaceName` {String}

Returns an array of all methods in a specified interface. If the interface does
not exist, it should return any falsy value, such as null or undefined.

## Interface: IServerApplicationsProvider

### appsProvider.getApplication(applicationName)

* `applicationName` {String} application name.
* Return: {[IApplication](#interface-iapplication)} application object.

Returns an application instance by name.

## Interface: IClientApplicationProvider

## Class: Application

## Class: ServerApplicationsProvider

## Class: ClientApplicationsProvider
