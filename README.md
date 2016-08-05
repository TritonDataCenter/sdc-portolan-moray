<!--
    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
-->

<!--
    Copyright (c) 2016, Joyent, Inc.
-->

# sdc-portolan-moray

This repository is part of the Joyent Triton project. See the [contribution
guidelines](https://github.com/joyent/triton/blob/master/CONTRIBUTING.md) --
*Triton does not use GitHub PRs* -- and general documentation at the main
[Triton project](https://github.com/joyent/triton) page.

Portolan Moray is the helper module for reading and writing to the portolan
moray buckets. It is used by [NAPI](https://github.com/joyent/sdc-napi) as a
producer, and [portolan](https://github.com/joyent/sdc-portolan) as a
consumer. See those repos for tests and further information.


## Development

To run tests:

    make test

To run style and lint checks:

    make check

To run all checks and tests:

    make prepush


## Test

Describe steps necessary for testing here.

    make test


## License

sdc-portolan-moray is licensed under the
[Mozilla Public License version 2.0](http://mozilla.org/MPL/2.0/).
See the file LICENSE.
