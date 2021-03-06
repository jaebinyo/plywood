/*
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
import { PostgresDialect } from "../dialect/postgresDialect";
import { PseudoDatum } from "../datatypes/dataset";

export interface PostgresSQLDescribeRow {
  name: string;
  sqlType: string;
  arrayType?: string;
}

export class PostgresExternal extends SQLExternal {
  static type = 'DATASET';

  static fromJS(parameters: ExternalJS, requester: Requester.PlywoodRequester<any>): PostgresExternal {
    var value: ExternalValue = External.jsToValue(parameters, requester);
    return new PostgresExternal(value);
  }

  static postProcessIntrospect(columns: PostgresSQLDescribeRow[]): Attributes {
    return columns.map((column: PostgresSQLDescribeRow) => {
      var name = column.name;
      var sqlType = column.sqlType.toLowerCase();
      if (sqlType.indexOf('timestamp') !== -1) {
        return new AttributeInfo({ name, type: 'TIME' });
      } else if (sqlType === 'character varying') {
        return new AttributeInfo({ name, type: 'STRING' });
      } else if (sqlType === 'integer' || sqlType === 'bigint') {
        // ToDo: make something special for integers
        return new AttributeInfo({ name, type: 'NUMBER' });
      } else if (sqlType === 'double precision' || sqlType === 'float') {
        return new AttributeInfo({ name, type: 'NUMBER' });
      } else if (sqlType === 'boolean') {
        return new AttributeInfo({ name, type: 'BOOLEAN' });
      } else if (sqlType === 'array') {
        var arrayType = column.arrayType.toLowerCase();
        if (arrayType === 'character') return new AttributeInfo({ name, type: 'SET/STRING' });
        else if (arrayType === 'timestamp') return new AttributeInfo({ name, type: 'SET/TIME' });
        else if (arrayType === 'integer' || arrayType === 'bigint' || sqlType === 'double precision' || sqlType === 'float') return new AttributeInfo({ name, type: 'SET/NUMBER' });
        else if (arrayType === 'boolean') return new AttributeInfo({ name, type: 'SET/BOOLEAN' });
        return null;
      }
      return null;
    }).filter(Boolean);
  }

  static getSourceList(requester: Requester.PlywoodRequester<any>): Q.Promise<string[]> {
    return requester({
      query: `SELECT table_name AS "tab" FROM INFORMATION_SCHEMA.TABLES WHERE table_type = 'BASE TABLE' AND table_schema = 'public'`
    })
      .then((sources) => {
        if (!Array.isArray(sources)) throw new Error('invalid sources response');
        if (!sources.length) return sources;
        return sources.map((s: PseudoDatum) => s['tab']).sort();
      });
  }

  static getVersion(requester: Requester.PlywoodRequester<any>): Q.Promise<string> {
    return requester({ query: 'SELECT version()' })
      .then((res) => {
        if (!Array.isArray(res) || res.length !== 1) throw new Error('invalid version response');
        var key = Object.keys(res[0])[0];
        if (!key) throw new Error('invalid version response (no key)');
        var versionString = res[0][key];
        var match: string[];
        if (match = versionString.match(/^PostgreSQL (\S+) on/)) versionString = match[1];
        return versionString;
      });
  }

  constructor(parameters: ExternalValue) {
    super(parameters, new PostgresDialect());
    this._ensureEngine("postgres");
  }

  protected getIntrospectAttributes(): Q.Promise<Attributes> {
    // from https://www.postgresql.org/docs/9.1/static/infoschema-element-types.html
    return this.requester({
      query: `SELECT c.column_name as "name", c.data_type as "sqlType", e.data_type AS "arrayType"
       FROM information_schema.columns c LEFT JOIN information_schema.element_types e
       ON ((c.table_catalog, c.table_schema, c.table_name, 'TABLE', c.dtd_identifier)
       = (e.object_catalog, e.object_schema, e.object_name, e.object_type, e.collection_type_identifier))
       WHERE table_name = ${this.dialect.escapeLiteral(this.source as string)}`,
    }).then(PostgresExternal.postProcessIntrospect);
  }
}

External.register(PostgresExternal, 'postgres');
