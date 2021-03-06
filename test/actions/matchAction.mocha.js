/*
 * Copyright 2012-2015 Metamarkets Group Inc.
 * Copyright 2015-2016 Imply Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var { expect } = require("chai");

var plywood = require('../../build/plywood');
var { $, ply, r, MatchAction } = plywood;

describe("MatchAction", () => {
  it(".likeToRegExp", () => {
    expect(MatchAction.likeToRegExp('%David\\_R_ss%')).to.equal('^.*David_R.ss.*$');

    expect(MatchAction.likeToRegExp('%David|_R_ss||%', '|')).to.equal('^.*David_R.ss\\|.*$');
  });
});
