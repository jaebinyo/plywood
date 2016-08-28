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

import * as Q from 'q';
import { External, ExternalJS, ExternalValue } from "./baseExternal";
import { SQLExternal } from "./sqlExternal";
import { AttributeInfo, Attributes } from "../datatypes/attributeInfo";
import { PseudoDatum } from "../datatypes/dataset";
import { ClickHouseDialect } from "../dialect/clickhouseDialect";

export interface ClickHouseDescribeRow {
  name: string;
  sqlType: string;
}

export class ClickHouseExternal extends SQLExternal {
  static type = 'DATASET';

  static fromJS(parameters: ExternalJS, requester: Requester.PlywoodRequester<any>): ClickHouseExternal {
    var value: ExternalValue = External.jsToValue(parameters, requester);
    return new ClickHouseExternal(value);
  }

  static postProcessIntrospect(columns: ClickHouseDescribeRow[]): Attributes {
    return columns.map((column: ClickHouseDescribeRow) => {
      var name = column.name;
      var sqlType = column.sqlType.toLowerCase();
      if (sqlType === 'date' || sqlType === 'datetime') {
        return new AttributeInfo({ name, type: 'TIME' });
      } else if (sqlType === 'string' || sqlType === 'fixedstring') {
        return new AttributeInfo({ name, type: 'STRING' });
      } else if (sqlType === 'uint8' || sqlType === 'uint16' || sqlType === 'uint32' ||
                 sqlType === 'uint64' || sqlType === 'int8' || sqlType === 'int16' ||
                 sqlType === 'int32' || sqlType === 'int64' || sqlType === 'float32' ||
                 sqlType === 'float64') {
        return new AttributeInfo({ name, type: 'NUMBER' });
      }
      return null;
    }).filter(Boolean);
  }

  static getSourceList(requester: Requester.PlywoodRequester<any>): Q.Promise<string[]> {
    return requester({ query: "SHOW TABLES" })
      .then((sources) => {
        if (!Array.isArray(sources)) throw new Error('invalid sources response');
        if (!sources.length) return sources;
        var key = Object.keys(sources[0])[0];
        if (!key) throw new Error('invalid sources response (no key)');
        return sources.map((s: PseudoDatum) => s[key]).sort();
      });
  }

  static getVersion(requester: Requester.PlywoodRequester<any>): Q.Promise<string> {
    return requester({ query: 'SELECT version()' })
      .then((res) => {
        return res[0];
      });
  }

  constructor(parameters: ExternalValue) {
    super(parameters, new ClickHouseDialect());
    this._ensureEngine("clickhouse");
  }

  protected getIntrospectAttributes(): Q.Promise<Attributes> {
    return this.requester({ query: `DESCRIBE ${this.dialect.escapeName(this.source as string)}`, }).then(ClickHouseExternal.postProcessIntrospect);
  }
}

External.register(ClickHouseExternal, 'clickhouse');
