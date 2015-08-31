# Odata uiGrid
UiGrid extension for working with [odata](http://www.odata.org/) protocol thanks to
[ODataAngularResources](https://github.com/devnixs/ODataAngularResources).

This is a work in progress and there is a demo application with two grids,
one using odatav4 and the other odata v3 demo endpoints.

## How to use
Just load `odata.ui.grid` module to your main angular application.
``angular.module("app", ["odata.ui.grid"]);``

## How to run the demo
The project comes with a demo application and a complete automated gulp build process with dev server, just run:
``npm install``
``bower install``
``gulp dev``

## Limitations and ToDo's
- There are still some problems when filtering 'Int' type columns with filters like 'starts_with'.
- Custom date filters (use a calendar widget selector).
- Unit tests.

## Author
Rodrigo Pimentel

## License
The MIT License (MIT)

Copyright (c) 2015 Rodrigo Pimentel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
