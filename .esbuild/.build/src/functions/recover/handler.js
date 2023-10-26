var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/serverless-postgres/src/utils.js
var require_utils = __commonJS({
  "node_modules/serverless-postgres/src/utils.js"(exports, module2) {
    function type(val) {
      return Object.prototype.toString.call(val).slice(8, -1);
    }
    function isType(typeName, value) {
      const t = type(value);
      return t === typeName;
    }
    function isValidStrategy(strategy) {
      const s = ["minimum_idle_time", "ranked"];
      return s.includes(strategy);
    }
    function isNegative(num) {
      return num < 0;
    }
    function validateNum(num) {
      return num && type(num) !== "Number" || isNegative(num);
    }
    function isWithinRange(num, min, max) {
      if (!num) {
        return true;
      }
      return num >= min && num <= max;
    }
    module2.exports = {
      type,
      isType,
      isValidStrategy,
      isNegative,
      validateNum,
      isWithinRange
    };
  }
});

// node_modules/serverless-postgres/src/postgres.js
var require_postgres = __commonJS({
  "node_modules/serverless-postgres/src/postgres.js"(exports, module2) {
    var Postgres = class {
      constructor() {
      }
      async getIdleProcessesListByMinimumTimeout(serverlessPgSelf) {
        const query = `
        WITH processes AS (SELECT EXTRACT(EPOCH FROM (Now() - state_change)) AS idle_time,
                                  pid
                           FROM pg_stat_activity
                           WHERE usename = $1
                             AND datname = $2
                             AND state = 'idle'
                             AND application_name = $5)
        SELECT pid
        FROM processes
        WHERE idle_time > $3
            LIMIT $4;`;
        const values = [
          serverlessPgSelf._client.user,
          serverlessPgSelf._client.database,
          serverlessPgSelf._strategy.minConnIdleTimeSec,
          serverlessPgSelf._strategy.maxIdleConnectionsToKill,
          serverlessPgSelf._application_name
        ];
        return serverlessPgSelf._client.query(query, values);
      }
      async getIdleProcessesListOrderByDate(serverlessPgSelf) {
        const query = `
      SELECT pid, backend_start, state
      FROM pg_stat_activity
      WHERE datname = $1
        AND state = 'idle'
        AND usename = $2
        AND application_name = $4
      ORDER BY state_change
      LIMIT $3;`;
        const values = [
          serverlessPgSelf._client.database,
          serverlessPgSelf._client.user,
          serverlessPgSelf._strategy.maxIdleConnectionsToKill,
          serverlessPgSelf._application_name
        ];
        return serverlessPgSelf._client.query(query, values);
      }
      async processCount(serverlessPgSelf) {
        const query = `
        SELECT COUNT(pid)
        FROM pg_stat_activity
        WHERE datname = $1
          AND usename = $2
          AND application_name = $3;`;
        const values = [serverlessPgSelf._client.database, serverlessPgSelf._client.user, serverlessPgSelf._application_name];
        return serverlessPgSelf._client.query(query, values);
      }
      async killProcesses(serverlessPgSelf, pids) {
        const query = `
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE pid = ANY ($1)
          AND state = 'idle'
          AND application_name = $2;`;
        const values = [pids, serverlessPgSelf._application_name];
        return serverlessPgSelf._client.query(query, values);
      }
      async showMaxConnections(serverlessPgSelf) {
        const query = `SHOW max_connections`;
        return serverlessPgSelf._client.query(query);
      }
    };
    module2.exports = Postgres;
  }
});

// node_modules/postgres-array/index.js
var require_postgres_array = __commonJS({
  "node_modules/postgres-array/index.js"(exports) {
    "use strict";
    exports.parse = function(source, transform) {
      return new ArrayParser(source, transform).parse();
    };
    var ArrayParser = class _ArrayParser {
      constructor(source, transform) {
        this.source = source;
        this.transform = transform || identity;
        this.position = 0;
        this.entries = [];
        this.recorded = [];
        this.dimension = 0;
      }
      isEof() {
        return this.position >= this.source.length;
      }
      nextCharacter() {
        var character = this.source[this.position++];
        if (character === "\\") {
          return {
            value: this.source[this.position++],
            escaped: true
          };
        }
        return {
          value: character,
          escaped: false
        };
      }
      record(character) {
        this.recorded.push(character);
      }
      newEntry(includeEmpty) {
        var entry;
        if (this.recorded.length > 0 || includeEmpty) {
          entry = this.recorded.join("");
          if (entry === "NULL" && !includeEmpty) {
            entry = null;
          }
          if (entry !== null)
            entry = this.transform(entry);
          this.entries.push(entry);
          this.recorded = [];
        }
      }
      consumeDimensions() {
        if (this.source[0] === "[") {
          while (!this.isEof()) {
            var char = this.nextCharacter();
            if (char.value === "=")
              break;
          }
        }
      }
      parse(nested) {
        var character, parser, quote;
        this.consumeDimensions();
        while (!this.isEof()) {
          character = this.nextCharacter();
          if (character.value === "{" && !quote) {
            this.dimension++;
            if (this.dimension > 1) {
              parser = new _ArrayParser(this.source.substr(this.position - 1), this.transform);
              this.entries.push(parser.parse(true));
              this.position += parser.position - 2;
            }
          } else if (character.value === "}" && !quote) {
            this.dimension--;
            if (!this.dimension) {
              this.newEntry();
              if (nested)
                return this.entries;
            }
          } else if (character.value === '"' && !character.escaped) {
            if (quote)
              this.newEntry(true);
            quote = !quote;
          } else if (character.value === "," && !quote) {
            this.newEntry();
          } else {
            this.record(character.value);
          }
        }
        if (this.dimension !== 0) {
          throw new Error("array dimension not balanced");
        }
        return this.entries;
      }
    };
    function identity(value) {
      return value;
    }
  }
});

// node_modules/pg-types/lib/arrayParser.js
var require_arrayParser = __commonJS({
  "node_modules/pg-types/lib/arrayParser.js"(exports, module2) {
    var array = require_postgres_array();
    module2.exports = {
      create: function(source, transform) {
        return {
          parse: function() {
            return array.parse(source, transform);
          }
        };
      }
    };
  }
});

// node_modules/postgres-date/index.js
var require_postgres_date = __commonJS({
  "node_modules/postgres-date/index.js"(exports, module2) {
    "use strict";
    var DATE_TIME = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/;
    var DATE = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/;
    var TIME_ZONE = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/;
    var INFINITY = /^-?infinity$/;
    module2.exports = function parseDate(isoDate) {
      if (INFINITY.test(isoDate)) {
        return Number(isoDate.replace("i", "I"));
      }
      var matches = DATE_TIME.exec(isoDate);
      if (!matches) {
        return getDate(isoDate) || null;
      }
      var isBC = !!matches[8];
      var year = parseInt(matches[1], 10);
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var hour = parseInt(matches[4], 10);
      var minute = parseInt(matches[5], 10);
      var second = parseInt(matches[6], 10);
      var ms = matches[7];
      ms = ms ? 1e3 * parseFloat(ms) : 0;
      var date;
      var offset = timeZoneOffset(isoDate);
      if (offset != null) {
        date = new Date(Date.UTC(year, month, day, hour, minute, second, ms));
        if (is0To99(year)) {
          date.setUTCFullYear(year);
        }
        if (offset !== 0) {
          date.setTime(date.getTime() - offset);
        }
      } else {
        date = new Date(year, month, day, hour, minute, second, ms);
        if (is0To99(year)) {
          date.setFullYear(year);
        }
      }
      return date;
    };
    function getDate(isoDate) {
      var matches = DATE.exec(isoDate);
      if (!matches) {
        return;
      }
      var year = parseInt(matches[1], 10);
      var isBC = !!matches[4];
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var date = new Date(year, month, day);
      if (is0To99(year)) {
        date.setFullYear(year);
      }
      return date;
    }
    function timeZoneOffset(isoDate) {
      if (isoDate.endsWith("+00")) {
        return 0;
      }
      var zone = TIME_ZONE.exec(isoDate.split(" ")[1]);
      if (!zone)
        return;
      var type = zone[1];
      if (type === "Z") {
        return 0;
      }
      var sign = type === "-" ? -1 : 1;
      var offset = parseInt(zone[2], 10) * 3600 + parseInt(zone[3] || 0, 10) * 60 + parseInt(zone[4] || 0, 10);
      return offset * sign * 1e3;
    }
    function bcYearToNegativeYear(year) {
      return -(year - 1);
    }
    function is0To99(num) {
      return num >= 0 && num < 100;
    }
  }
});

// node_modules/xtend/mutable.js
var require_mutable = __commonJS({
  "node_modules/xtend/mutable.js"(exports, module2) {
    module2.exports = extend;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function extend(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    }
  }
});

// node_modules/postgres-interval/index.js
var require_postgres_interval = __commonJS({
  "node_modules/postgres-interval/index.js"(exports, module2) {
    "use strict";
    var extend = require_mutable();
    module2.exports = PostgresInterval;
    function PostgresInterval(raw) {
      if (!(this instanceof PostgresInterval)) {
        return new PostgresInterval(raw);
      }
      extend(this, parse(raw));
    }
    var properties = ["seconds", "minutes", "hours", "days", "months", "years"];
    PostgresInterval.prototype.toPostgres = function() {
      var filtered = properties.filter(this.hasOwnProperty, this);
      if (this.milliseconds && filtered.indexOf("seconds") < 0) {
        filtered.push("seconds");
      }
      if (filtered.length === 0)
        return "0";
      return filtered.map(function(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/\.?0+$/, "");
        }
        return value + " " + property;
      }, this).join(" ");
    };
    var propertiesISOEquivalent = {
      years: "Y",
      months: "M",
      days: "D",
      hours: "H",
      minutes: "M",
      seconds: "S"
    };
    var dateProperties = ["years", "months", "days"];
    var timeProperties = ["hours", "minutes", "seconds"];
    PostgresInterval.prototype.toISOString = PostgresInterval.prototype.toISO = function() {
      var datePart = dateProperties.map(buildProperty, this).join("");
      var timePart = timeProperties.map(buildProperty, this).join("");
      return "P" + datePart + "T" + timePart;
      function buildProperty(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/0+$/, "");
        }
        return value + propertiesISOEquivalent[property];
      }
    };
    var NUMBER = "([+-]?\\d+)";
    var YEAR = NUMBER + "\\s+years?";
    var MONTH = NUMBER + "\\s+mons?";
    var DAY = NUMBER + "\\s+days?";
    var TIME = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?";
    var INTERVAL = new RegExp([YEAR, MONTH, DAY, TIME].map(function(regexString) {
      return "(" + regexString + ")?";
    }).join("\\s*"));
    var positions = {
      years: 2,
      months: 4,
      days: 6,
      hours: 9,
      minutes: 10,
      seconds: 11,
      milliseconds: 12
    };
    var negatives = ["hours", "minutes", "seconds", "milliseconds"];
    function parseMilliseconds(fraction) {
      var microseconds = fraction + "000000".slice(fraction.length);
      return parseInt(microseconds, 10) / 1e3;
    }
    function parse(interval) {
      if (!interval)
        return {};
      var matches = INTERVAL.exec(interval);
      var isNegative = matches[8] === "-";
      return Object.keys(positions).reduce(function(parsed, property) {
        var position = positions[property];
        var value = matches[position];
        if (!value)
          return parsed;
        value = property === "milliseconds" ? parseMilliseconds(value) : parseInt(value, 10);
        if (!value)
          return parsed;
        if (isNegative && ~negatives.indexOf(property)) {
          value *= -1;
        }
        parsed[property] = value;
        return parsed;
      }, {});
    }
  }
});

// node_modules/postgres-bytea/index.js
var require_postgres_bytea = __commonJS({
  "node_modules/postgres-bytea/index.js"(exports, module2) {
    "use strict";
    module2.exports = function parseBytea(input) {
      if (/^\\x/.test(input)) {
        return new Buffer(input.substr(2), "hex");
      }
      var output = "";
      var i = 0;
      while (i < input.length) {
        if (input[i] !== "\\") {
          output += input[i];
          ++i;
        } else {
          if (/[0-7]{3}/.test(input.substr(i + 1, 3))) {
            output += String.fromCharCode(parseInt(input.substr(i + 1, 3), 8));
            i += 4;
          } else {
            var backslashes = 1;
            while (i + backslashes < input.length && input[i + backslashes] === "\\") {
              backslashes++;
            }
            for (var k = 0; k < Math.floor(backslashes / 2); ++k) {
              output += "\\";
            }
            i += Math.floor(backslashes / 2) * 2;
          }
        }
      }
      return new Buffer(output, "binary");
    };
  }
});

// node_modules/pg-types/lib/textParsers.js
var require_textParsers = __commonJS({
  "node_modules/pg-types/lib/textParsers.js"(exports, module2) {
    var array = require_postgres_array();
    var arrayParser = require_arrayParser();
    var parseDate = require_postgres_date();
    var parseInterval = require_postgres_interval();
    var parseByteA = require_postgres_bytea();
    function allowNull(fn) {
      return function nullAllowed(value) {
        if (value === null)
          return value;
        return fn(value);
      };
    }
    function parseBool(value) {
      if (value === null)
        return value;
      return value === "TRUE" || value === "t" || value === "true" || value === "y" || value === "yes" || value === "on" || value === "1";
    }
    function parseBoolArray(value) {
      if (!value)
        return null;
      return array.parse(value, parseBool);
    }
    function parseBaseTenInt(string) {
      return parseInt(string, 10);
    }
    function parseIntegerArray(value) {
      if (!value)
        return null;
      return array.parse(value, allowNull(parseBaseTenInt));
    }
    function parseBigIntegerArray(value) {
      if (!value)
        return null;
      return array.parse(value, allowNull(function(entry) {
        return parseBigInteger(entry).trim();
      }));
    }
    var parsePointArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parsePoint(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseFloatArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseFloat(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseStringArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value);
      return p.parse();
    };
    var parseDateArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseDate(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseIntervalArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseInterval(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseByteAArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(parseByteA));
    };
    var parseInteger = function(value) {
      return parseInt(value, 10);
    };
    var parseBigInteger = function(value) {
      var valStr = String(value);
      if (/^\d+$/.test(valStr)) {
        return valStr;
      }
      return value;
    };
    var parseJsonArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(JSON.parse));
    };
    var parsePoint = function(value) {
      if (value[0] !== "(") {
        return null;
      }
      value = value.substring(1, value.length - 1).split(",");
      return {
        x: parseFloat(value[0]),
        y: parseFloat(value[1])
      };
    };
    var parseCircle = function(value) {
      if (value[0] !== "<" && value[1] !== "(") {
        return null;
      }
      var point = "(";
      var radius = "";
      var pointParsed = false;
      for (var i = 2; i < value.length - 1; i++) {
        if (!pointParsed) {
          point += value[i];
        }
        if (value[i] === ")") {
          pointParsed = true;
          continue;
        } else if (!pointParsed) {
          continue;
        }
        if (value[i] === ",") {
          continue;
        }
        radius += value[i];
      }
      var result = parsePoint(point);
      result.radius = parseFloat(radius);
      return result;
    };
    var init = function(register) {
      register(20, parseBigInteger);
      register(21, parseInteger);
      register(23, parseInteger);
      register(26, parseInteger);
      register(700, parseFloat);
      register(701, parseFloat);
      register(16, parseBool);
      register(1082, parseDate);
      register(1114, parseDate);
      register(1184, parseDate);
      register(600, parsePoint);
      register(651, parseStringArray);
      register(718, parseCircle);
      register(1e3, parseBoolArray);
      register(1001, parseByteAArray);
      register(1005, parseIntegerArray);
      register(1007, parseIntegerArray);
      register(1028, parseIntegerArray);
      register(1016, parseBigIntegerArray);
      register(1017, parsePointArray);
      register(1021, parseFloatArray);
      register(1022, parseFloatArray);
      register(1231, parseFloatArray);
      register(1014, parseStringArray);
      register(1015, parseStringArray);
      register(1008, parseStringArray);
      register(1009, parseStringArray);
      register(1040, parseStringArray);
      register(1041, parseStringArray);
      register(1115, parseDateArray);
      register(1182, parseDateArray);
      register(1185, parseDateArray);
      register(1186, parseInterval);
      register(1187, parseIntervalArray);
      register(17, parseByteA);
      register(114, JSON.parse.bind(JSON));
      register(3802, JSON.parse.bind(JSON));
      register(199, parseJsonArray);
      register(3807, parseJsonArray);
      register(3907, parseStringArray);
      register(2951, parseStringArray);
      register(791, parseStringArray);
      register(1183, parseStringArray);
      register(1270, parseStringArray);
    };
    module2.exports = {
      init
    };
  }
});

// node_modules/pg-int8/index.js
var require_pg_int8 = __commonJS({
  "node_modules/pg-int8/index.js"(exports, module2) {
    "use strict";
    var BASE = 1e6;
    function readInt8(buffer) {
      var high = buffer.readInt32BE(0);
      var low = buffer.readUInt32BE(4);
      var sign = "";
      if (high < 0) {
        high = ~high + (low === 0);
        low = ~low + 1 >>> 0;
        sign = "-";
      }
      var result = "";
      var carry;
      var t;
      var digits;
      var pad;
      var l;
      var i;
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        t = 4294967296 * carry + low;
        digits = "" + t % BASE;
        return sign + digits + result;
      }
    }
    module2.exports = readInt8;
  }
});

// node_modules/pg-types/lib/binaryParsers.js
var require_binaryParsers = __commonJS({
  "node_modules/pg-types/lib/binaryParsers.js"(exports, module2) {
    var parseInt64 = require_pg_int8();
    var parseBits = function(data, bits, offset, invert, callback) {
      offset = offset || 0;
      invert = invert || false;
      callback = callback || function(lastValue, newValue, bits2) {
        return lastValue * Math.pow(2, bits2) + newValue;
      };
      var offsetBytes = offset >> 3;
      var inv = function(value) {
        if (invert) {
          return ~value & 255;
        }
        return value;
      };
      var mask = 255;
      var firstBits = 8 - offset % 8;
      if (bits < firstBits) {
        mask = 255 << 8 - bits & 255;
        firstBits = bits;
      }
      if (offset) {
        mask = mask >> offset % 8;
      }
      var result = 0;
      if (offset % 8 + bits >= 8) {
        result = callback(0, inv(data[offsetBytes]) & mask, firstBits);
      }
      var bytes = bits + offset >> 3;
      for (var i = offsetBytes + 1; i < bytes; i++) {
        result = callback(result, inv(data[i]), 8);
      }
      var lastBits = (bits + offset) % 8;
      if (lastBits > 0) {
        result = callback(result, inv(data[bytes]) >> 8 - lastBits, lastBits);
      }
      return result;
    };
    var parseFloatFromBits = function(data, precisionBits, exponentBits) {
      var bias = Math.pow(2, exponentBits - 1) - 1;
      var sign = parseBits(data, 1);
      var exponent = parseBits(data, exponentBits, 1);
      if (exponent === 0) {
        return 0;
      }
      var precisionBitsCounter = 1;
      var parsePrecisionBits = function(lastValue, newValue, bits) {
        if (lastValue === 0) {
          lastValue = 1;
        }
        for (var i = 1; i <= bits; i++) {
          precisionBitsCounter /= 2;
          if ((newValue & 1 << bits - i) > 0) {
            lastValue += precisionBitsCounter;
          }
        }
        return lastValue;
      };
      var mantissa = parseBits(data, precisionBits, exponentBits + 1, false, parsePrecisionBits);
      if (exponent == Math.pow(2, exponentBits + 1) - 1) {
        if (mantissa === 0) {
          return sign === 0 ? Infinity : -Infinity;
        }
        return NaN;
      }
      return (sign === 0 ? 1 : -1) * Math.pow(2, exponent - bias) * mantissa;
    };
    var parseInt16 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 15, 1, true) + 1);
      }
      return parseBits(value, 15, 1);
    };
    var parseInt32 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 31, 1, true) + 1);
      }
      return parseBits(value, 31, 1);
    };
    var parseFloat32 = function(value) {
      return parseFloatFromBits(value, 23, 8);
    };
    var parseFloat64 = function(value) {
      return parseFloatFromBits(value, 52, 11);
    };
    var parseNumeric = function(value) {
      var sign = parseBits(value, 16, 32);
      if (sign == 49152) {
        return NaN;
      }
      var weight = Math.pow(1e4, parseBits(value, 16, 16));
      var result = 0;
      var digits = [];
      var ndigits = parseBits(value, 16);
      for (var i = 0; i < ndigits; i++) {
        result += parseBits(value, 16, 64 + 16 * i) * weight;
        weight /= 1e4;
      }
      var scale = Math.pow(10, parseBits(value, 16, 48));
      return (sign === 0 ? 1 : -1) * Math.round(result * scale) / scale;
    };
    var parseDate = function(isUTC, value) {
      var sign = parseBits(value, 1);
      var rawValue = parseBits(value, 63, 1);
      var result = new Date((sign === 0 ? 1 : -1) * rawValue / 1e3 + 9466848e5);
      if (!isUTC) {
        result.setTime(result.getTime() + result.getTimezoneOffset() * 6e4);
      }
      result.usec = rawValue % 1e3;
      result.getMicroSeconds = function() {
        return this.usec;
      };
      result.setMicroSeconds = function(value2) {
        this.usec = value2;
      };
      result.getUTCMicroSeconds = function() {
        return this.usec;
      };
      return result;
    };
    var parseArray = function(value) {
      var dim = parseBits(value, 32);
      var flags = parseBits(value, 32, 32);
      var elementType = parseBits(value, 32, 64);
      var offset = 96;
      var dims = [];
      for (var i = 0; i < dim; i++) {
        dims[i] = parseBits(value, 32, offset);
        offset += 32;
        offset += 32;
      }
      var parseElement = function(elementType2) {
        var length = parseBits(value, 32, offset);
        offset += 32;
        if (length == 4294967295) {
          return null;
        }
        var result;
        if (elementType2 == 23 || elementType2 == 20) {
          result = parseBits(value, length * 8, offset);
          offset += length * 8;
          return result;
        } else if (elementType2 == 25) {
          result = value.toString(this.encoding, offset >> 3, (offset += length << 3) >> 3);
          return result;
        } else {
          console.log("ERROR: ElementType not implemented: " + elementType2);
        }
      };
      var parse = function(dimension, elementType2) {
        var array = [];
        var i2;
        if (dimension.length > 1) {
          var count = dimension.shift();
          for (i2 = 0; i2 < count; i2++) {
            array[i2] = parse(dimension, elementType2);
          }
          dimension.unshift(count);
        } else {
          for (i2 = 0; i2 < dimension[0]; i2++) {
            array[i2] = parseElement(elementType2);
          }
        }
        return array;
      };
      return parse(dims, elementType);
    };
    var parseText = function(value) {
      return value.toString("utf8");
    };
    var parseBool = function(value) {
      if (value === null)
        return null;
      return parseBits(value, 8) > 0;
    };
    var init = function(register) {
      register(20, parseInt64);
      register(21, parseInt16);
      register(23, parseInt32);
      register(26, parseInt32);
      register(1700, parseNumeric);
      register(700, parseFloat32);
      register(701, parseFloat64);
      register(16, parseBool);
      register(1114, parseDate.bind(null, false));
      register(1184, parseDate.bind(null, true));
      register(1e3, parseArray);
      register(1007, parseArray);
      register(1016, parseArray);
      register(1008, parseArray);
      register(1009, parseArray);
      register(25, parseText);
    };
    module2.exports = {
      init
    };
  }
});

// node_modules/pg-types/lib/builtins.js
var require_builtins = __commonJS({
  "node_modules/pg-types/lib/builtins.js"(exports, module2) {
    module2.exports = {
      BOOL: 16,
      BYTEA: 17,
      CHAR: 18,
      INT8: 20,
      INT2: 21,
      INT4: 23,
      REGPROC: 24,
      TEXT: 25,
      OID: 26,
      TID: 27,
      XID: 28,
      CID: 29,
      JSON: 114,
      XML: 142,
      PG_NODE_TREE: 194,
      SMGR: 210,
      PATH: 602,
      POLYGON: 604,
      CIDR: 650,
      FLOAT4: 700,
      FLOAT8: 701,
      ABSTIME: 702,
      RELTIME: 703,
      TINTERVAL: 704,
      CIRCLE: 718,
      MACADDR8: 774,
      MONEY: 790,
      MACADDR: 829,
      INET: 869,
      ACLITEM: 1033,
      BPCHAR: 1042,
      VARCHAR: 1043,
      DATE: 1082,
      TIME: 1083,
      TIMESTAMP: 1114,
      TIMESTAMPTZ: 1184,
      INTERVAL: 1186,
      TIMETZ: 1266,
      BIT: 1560,
      VARBIT: 1562,
      NUMERIC: 1700,
      REFCURSOR: 1790,
      REGPROCEDURE: 2202,
      REGOPER: 2203,
      REGOPERATOR: 2204,
      REGCLASS: 2205,
      REGTYPE: 2206,
      UUID: 2950,
      TXID_SNAPSHOT: 2970,
      PG_LSN: 3220,
      PG_NDISTINCT: 3361,
      PG_DEPENDENCIES: 3402,
      TSVECTOR: 3614,
      TSQUERY: 3615,
      GTSVECTOR: 3642,
      REGCONFIG: 3734,
      REGDICTIONARY: 3769,
      JSONB: 3802,
      REGNAMESPACE: 4089,
      REGROLE: 4096
    };
  }
});

// node_modules/pg-types/index.js
var require_pg_types = __commonJS({
  "node_modules/pg-types/index.js"(exports) {
    var textParsers = require_textParsers();
    var binaryParsers = require_binaryParsers();
    var arrayParser = require_arrayParser();
    var builtinTypes = require_builtins();
    exports.getTypeParser = getTypeParser;
    exports.setTypeParser = setTypeParser;
    exports.arrayParser = arrayParser;
    exports.builtins = builtinTypes;
    var typeParsers = {
      text: {},
      binary: {}
    };
    function noParse(val) {
      return String(val);
    }
    function getTypeParser(oid, format) {
      format = format || "text";
      if (!typeParsers[format]) {
        return noParse;
      }
      return typeParsers[format][oid] || noParse;
    }
    function setTypeParser(oid, format, parseFn) {
      if (typeof format == "function") {
        parseFn = format;
        format = "text";
      }
      typeParsers[format][oid] = parseFn;
    }
    textParsers.init(function(oid, converter) {
      typeParsers.text[oid] = converter;
    });
    binaryParsers.init(function(oid, converter) {
      typeParsers.binary[oid] = converter;
    });
  }
});

// node_modules/pg/lib/defaults.js
var require_defaults = __commonJS({
  "node_modules/pg/lib/defaults.js"(exports, module2) {
    "use strict";
    module2.exports = {
      // database host. defaults to localhost
      host: "localhost",
      // database user's name
      user: process.platform === "win32" ? process.env.USERNAME : process.env.USER,
      // name of database to connect
      database: void 0,
      // database user's password
      password: null,
      // a Postgres connection string to be used instead of setting individual connection items
      // NOTE:  Setting this value will cause it to override any other value (such as database or user) defined
      // in the defaults object.
      connectionString: void 0,
      // database port
      port: 5432,
      // number of rows to return at a time from a prepared statement's
      // portal. 0 will return all rows at once
      rows: 0,
      // binary result mode
      binary: false,
      // Connection pool options - see https://github.com/brianc/node-pg-pool
      // number of connections to use in connection pool
      // 0 will disable connection pooling
      max: 10,
      // max milliseconds a client can go unused before it is removed
      // from the pool and destroyed
      idleTimeoutMillis: 3e4,
      client_encoding: "",
      ssl: false,
      application_name: void 0,
      fallback_application_name: void 0,
      options: void 0,
      parseInputDatesAsUTC: false,
      // max milliseconds any query using this connection will execute for before timing out in error.
      // false=unlimited
      statement_timeout: false,
      // Abort any statement that waits longer than the specified duration in milliseconds while attempting to acquire a lock.
      // false=unlimited
      lock_timeout: false,
      // Terminate any session with an open transaction that has been idle for longer than the specified duration in milliseconds
      // false=unlimited
      idle_in_transaction_session_timeout: false,
      // max milliseconds to wait for query to complete (client side)
      query_timeout: false,
      connect_timeout: 0,
      keepalives: 1,
      keepalives_idle: 0
    };
    var pgTypes = require_pg_types();
    var parseBigInteger = pgTypes.getTypeParser(20, "text");
    var parseBigIntegerArray = pgTypes.getTypeParser(1016, "text");
    module2.exports.__defineSetter__("parseInt8", function(val) {
      pgTypes.setTypeParser(20, "text", val ? pgTypes.getTypeParser(23, "text") : parseBigInteger);
      pgTypes.setTypeParser(1016, "text", val ? pgTypes.getTypeParser(1007, "text") : parseBigIntegerArray);
    });
  }
});

// node_modules/pg/lib/utils.js
var require_utils2 = __commonJS({
  "node_modules/pg/lib/utils.js"(exports, module2) {
    "use strict";
    var defaults2 = require_defaults();
    function escapeElement(elementRepresentation) {
      var escaped = elementRepresentation.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return '"' + escaped + '"';
    }
    function arrayString(val) {
      var result = "{";
      for (var i = 0; i < val.length; i++) {
        if (i > 0) {
          result = result + ",";
        }
        if (val[i] === null || typeof val[i] === "undefined") {
          result = result + "NULL";
        } else if (Array.isArray(val[i])) {
          result = result + arrayString(val[i]);
        } else if (val[i] instanceof Buffer) {
          result += "\\\\x" + val[i].toString("hex");
        } else {
          result += escapeElement(prepareValue(val[i]));
        }
      }
      result = result + "}";
      return result;
    }
    var prepareValue = function(val, seen) {
      if (val == null) {
        return null;
      }
      if (val instanceof Buffer) {
        return val;
      }
      if (ArrayBuffer.isView(val)) {
        var buf = Buffer.from(val.buffer, val.byteOffset, val.byteLength);
        if (buf.length === val.byteLength) {
          return buf;
        }
        return buf.slice(val.byteOffset, val.byteOffset + val.byteLength);
      }
      if (val instanceof Date) {
        if (defaults2.parseInputDatesAsUTC) {
          return dateToStringUTC(val);
        } else {
          return dateToString(val);
        }
      }
      if (Array.isArray(val)) {
        return arrayString(val);
      }
      if (typeof val === "object") {
        return prepareObject(val, seen);
      }
      return val.toString();
    };
    function prepareObject(val, seen) {
      if (val && typeof val.toPostgres === "function") {
        seen = seen || [];
        if (seen.indexOf(val) !== -1) {
          throw new Error('circular reference detected while preparing "' + val + '" for query');
        }
        seen.push(val);
        return prepareValue(val.toPostgres(prepareValue), seen);
      }
      return JSON.stringify(val);
    }
    function pad(number, digits) {
      number = "" + number;
      while (number.length < digits) {
        number = "0" + number;
      }
      return number;
    }
    function dateToString(date) {
      var offset = -date.getTimezoneOffset();
      var year = date.getFullYear();
      var isBCYear = year < 1;
      if (isBCYear)
        year = Math.abs(year) + 1;
      var ret = pad(year, 4) + "-" + pad(date.getMonth() + 1, 2) + "-" + pad(date.getDate(), 2) + "T" + pad(date.getHours(), 2) + ":" + pad(date.getMinutes(), 2) + ":" + pad(date.getSeconds(), 2) + "." + pad(date.getMilliseconds(), 3);
      if (offset < 0) {
        ret += "-";
        offset *= -1;
      } else {
        ret += "+";
      }
      ret += pad(Math.floor(offset / 60), 2) + ":" + pad(offset % 60, 2);
      if (isBCYear)
        ret += " BC";
      return ret;
    }
    function dateToStringUTC(date) {
      var year = date.getUTCFullYear();
      var isBCYear = year < 1;
      if (isBCYear)
        year = Math.abs(year) + 1;
      var ret = pad(year, 4) + "-" + pad(date.getUTCMonth() + 1, 2) + "-" + pad(date.getUTCDate(), 2) + "T" + pad(date.getUTCHours(), 2) + ":" + pad(date.getUTCMinutes(), 2) + ":" + pad(date.getUTCSeconds(), 2) + "." + pad(date.getUTCMilliseconds(), 3);
      ret += "+00:00";
      if (isBCYear)
        ret += " BC";
      return ret;
    }
    function normalizeQueryConfig(config, values, callback) {
      config = typeof config === "string" ? { text: config } : config;
      if (values) {
        if (typeof values === "function") {
          config.callback = values;
        } else {
          config.values = values;
        }
      }
      if (callback) {
        config.callback = callback;
      }
      return config;
    }
    var escapeIdentifier = function(str) {
      return '"' + str.replace(/"/g, '""') + '"';
    };
    var escapeLiteral = function(str) {
      var hasBackslash = false;
      var escaped = "'";
      for (var i = 0; i < str.length; i++) {
        var c = str[i];
        if (c === "'") {
          escaped += c + c;
        } else if (c === "\\") {
          escaped += c + c;
          hasBackslash = true;
        } else {
          escaped += c;
        }
      }
      escaped += "'";
      if (hasBackslash === true) {
        escaped = " E" + escaped;
      }
      return escaped;
    };
    module2.exports = {
      prepareValue: function prepareValueWrapper(value) {
        return prepareValue(value);
      },
      normalizeQueryConfig,
      escapeIdentifier,
      escapeLiteral
    };
  }
});

// node_modules/pg/lib/crypto/utils-legacy.js
var require_utils_legacy = __commonJS({
  "node_modules/pg/lib/crypto/utils-legacy.js"(exports, module2) {
    "use strict";
    var nodeCrypto = require("crypto");
    function md5(string) {
      return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
    }
    function postgresMd5PasswordHash(user, password, salt) {
      var inner = md5(password + user);
      var outer = md5(Buffer.concat([Buffer.from(inner), salt]));
      return "md5" + outer;
    }
    function sha256(text) {
      return nodeCrypto.createHash("sha256").update(text).digest();
    }
    function hmacSha256(key, msg) {
      return nodeCrypto.createHmac("sha256", key).update(msg).digest();
    }
    async function deriveKey(password, salt, iterations) {
      return nodeCrypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
    }
    module2.exports = {
      postgresMd5PasswordHash,
      randomBytes: nodeCrypto.randomBytes,
      deriveKey,
      sha256,
      hmacSha256,
      md5
    };
  }
});

// node_modules/pg/lib/crypto/utils-webcrypto.js
var require_utils_webcrypto = __commonJS({
  "node_modules/pg/lib/crypto/utils-webcrypto.js"(exports, module2) {
    var nodeCrypto = require("crypto");
    module2.exports = {
      postgresMd5PasswordHash,
      randomBytes,
      deriveKey,
      sha256,
      hmacSha256,
      md5
    };
    var webCrypto = nodeCrypto.webcrypto || globalThis.crypto;
    var subtleCrypto = webCrypto.subtle;
    var textEncoder = new TextEncoder();
    function randomBytes(length) {
      return webCrypto.getRandomValues(Buffer.alloc(length));
    }
    async function md5(string) {
      try {
        return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
      } catch (e) {
        const data = typeof string === "string" ? textEncoder.encode(string) : string;
        const hash = await subtleCrypto.digest("MD5", data);
        return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    }
    async function postgresMd5PasswordHash(user, password, salt) {
      var inner = await md5(password + user);
      var outer = await md5(Buffer.concat([Buffer.from(inner), salt]));
      return "md5" + outer;
    }
    async function sha256(text) {
      return await subtleCrypto.digest("SHA-256", text);
    }
    async function hmacSha256(keyBuffer, msg) {
      const key = await subtleCrypto.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return await subtleCrypto.sign("HMAC", key, textEncoder.encode(msg));
    }
    async function deriveKey(password, salt, iterations) {
      const key = await subtleCrypto.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
      const params = { name: "PBKDF2", hash: "SHA-256", salt, iterations };
      return await subtleCrypto.deriveBits(params, key, 32 * 8, ["deriveBits"]);
    }
  }
});

// node_modules/pg/lib/crypto/utils.js
var require_utils3 = __commonJS({
  "node_modules/pg/lib/crypto/utils.js"(exports, module2) {
    "use strict";
    var useLegacyCrypto = parseInt(process.versions && process.versions.node && process.versions.node.split(".")[0]) < 15;
    if (useLegacyCrypto) {
      module2.exports = require_utils_legacy();
    } else {
      module2.exports = require_utils_webcrypto();
    }
  }
});

// node_modules/pg/lib/crypto/sasl.js
var require_sasl = __commonJS({
  "node_modules/pg/lib/crypto/sasl.js"(exports, module2) {
    "use strict";
    var crypto3 = require_utils3();
    function startSession(mechanisms) {
      if (mechanisms.indexOf("SCRAM-SHA-256") === -1) {
        throw new Error("SASL: Only mechanism SCRAM-SHA-256 is currently supported");
      }
      const clientNonce = crypto3.randomBytes(18).toString("base64");
      return {
        mechanism: "SCRAM-SHA-256",
        clientNonce,
        response: "n,,n=*,r=" + clientNonce,
        message: "SASLInitialResponse"
      };
    }
    async function continueSession(session, password, serverData) {
      if (session.message !== "SASLInitialResponse") {
        throw new Error("SASL: Last message was not SASLInitialResponse");
      }
      if (typeof password !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
      }
      if (password === "") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
      }
      const sv = parseServerFirstMessage(serverData);
      if (!sv.nonce.startsWith(session.clientNonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
      } else if (sv.nonce.length === session.clientNonce.length) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
      }
      var clientFirstMessageBare = "n=*,r=" + session.clientNonce;
      var serverFirstMessage = "r=" + sv.nonce + ",s=" + sv.salt + ",i=" + sv.iteration;
      var clientFinalMessageWithoutProof = "c=biws,r=" + sv.nonce;
      var authMessage = clientFirstMessageBare + "," + serverFirstMessage + "," + clientFinalMessageWithoutProof;
      var saltBytes = Buffer.from(sv.salt, "base64");
      var saltedPassword = await crypto3.deriveKey(password, saltBytes, sv.iteration);
      var clientKey = await crypto3.hmacSha256(saltedPassword, "Client Key");
      var storedKey = await crypto3.sha256(clientKey);
      var clientSignature = await crypto3.hmacSha256(storedKey, authMessage);
      var clientProof = xorBuffers(Buffer.from(clientKey), Buffer.from(clientSignature)).toString("base64");
      var serverKey = await crypto3.hmacSha256(saltedPassword, "Server Key");
      var serverSignatureBytes = await crypto3.hmacSha256(serverKey, authMessage);
      session.message = "SASLResponse";
      session.serverSignature = Buffer.from(serverSignatureBytes).toString("base64");
      session.response = clientFinalMessageWithoutProof + ",p=" + clientProof;
    }
    function finalizeSession(session, serverData) {
      if (session.message !== "SASLResponse") {
        throw new Error("SASL: Last message was not SASLResponse");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
      }
      const { serverSignature } = parseServerFinalMessage(serverData);
      if (serverSignature !== session.serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
      }
    }
    function isPrintableChars(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: text must be a string");
      }
      return text.split("").map((_, i) => text.charCodeAt(i)).every((c) => c >= 33 && c <= 43 || c >= 45 && c <= 126);
    }
    function isBase64(text) {
      return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(text);
    }
    function parseAttributePairs(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: attribute pairs text must be a string");
      }
      return new Map(
        text.split(",").map((attrValue) => {
          if (!/^.=/.test(attrValue)) {
            throw new Error("SASL: Invalid attribute pair entry");
          }
          const name = attrValue[0];
          const value = attrValue.substring(2);
          return [name, value];
        })
      );
    }
    function parseServerFirstMessage(data) {
      const attrPairs = parseAttributePairs(data);
      const nonce = attrPairs.get("r");
      if (!nonce) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
      } else if (!isPrintableChars(nonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
      }
      const salt = attrPairs.get("s");
      if (!salt) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
      } else if (!isBase64(salt)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
      }
      const iterationText = attrPairs.get("i");
      if (!iterationText) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
      } else if (!/^[1-9][0-9]*$/.test(iterationText)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
      }
      const iteration = parseInt(iterationText, 10);
      return {
        nonce,
        salt,
        iteration
      };
    }
    function parseServerFinalMessage(serverData) {
      const attrPairs = parseAttributePairs(serverData);
      const serverSignature = attrPairs.get("v");
      if (!serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
      } else if (!isBase64(serverSignature)) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
      }
      return {
        serverSignature
      };
    }
    function xorBuffers(a, b) {
      if (!Buffer.isBuffer(a)) {
        throw new TypeError("first argument must be a Buffer");
      }
      if (!Buffer.isBuffer(b)) {
        throw new TypeError("second argument must be a Buffer");
      }
      if (a.length !== b.length) {
        throw new Error("Buffer lengths must match");
      }
      if (a.length === 0) {
        throw new Error("Buffers cannot be empty");
      }
      return Buffer.from(a.map((_, i) => a[i] ^ b[i]));
    }
    module2.exports = {
      startSession,
      continueSession,
      finalizeSession
    };
  }
});

// node_modules/pg/lib/type-overrides.js
var require_type_overrides = __commonJS({
  "node_modules/pg/lib/type-overrides.js"(exports, module2) {
    "use strict";
    var types = require_pg_types();
    function TypeOverrides(userTypes) {
      this._types = userTypes || types;
      this.text = {};
      this.binary = {};
    }
    TypeOverrides.prototype.getOverrides = function(format) {
      switch (format) {
        case "text":
          return this.text;
        case "binary":
          return this.binary;
        default:
          return {};
      }
    };
    TypeOverrides.prototype.setTypeParser = function(oid, format, parseFn) {
      if (typeof format === "function") {
        parseFn = format;
        format = "text";
      }
      this.getOverrides(format)[oid] = parseFn;
    };
    TypeOverrides.prototype.getTypeParser = function(oid, format) {
      format = format || "text";
      return this.getOverrides(format)[oid] || this._types.getTypeParser(oid, format);
    };
    module2.exports = TypeOverrides;
  }
});

// node_modules/pg-connection-string/index.js
var require_pg_connection_string = __commonJS({
  "node_modules/pg-connection-string/index.js"(exports, module2) {
    "use strict";
    function parse(str) {
      if (str.charAt(0) === "/") {
        const config2 = str.split(" ");
        return { host: config2[0], database: config2[1] };
      }
      const config = {};
      let result;
      let dummyHost = false;
      if (/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str)) {
        str = encodeURI(str).replace(/\%25(\d\d)/g, "%$1");
      }
      try {
        result = new URL(str, "postgres://base");
      } catch (e) {
        result = new URL(str.replace("@/", "@___DUMMY___/"), "postgres://base");
        dummyHost = true;
      }
      for (const entry of result.searchParams.entries()) {
        config[entry[0]] = entry[1];
      }
      config.user = config.user || decodeURIComponent(result.username);
      config.password = config.password || decodeURIComponent(result.password);
      if (result.protocol == "socket:") {
        config.host = decodeURI(result.pathname);
        config.database = result.searchParams.get("db");
        config.client_encoding = result.searchParams.get("encoding");
        return config;
      }
      const hostname = dummyHost ? "" : result.hostname;
      if (!config.host) {
        config.host = decodeURIComponent(hostname);
      } else if (hostname && /^%2f/i.test(hostname)) {
        result.pathname = hostname + result.pathname;
      }
      if (!config.port) {
        config.port = result.port;
      }
      const pathname = result.pathname.slice(1) || null;
      config.database = pathname ? decodeURI(pathname) : null;
      if (config.ssl === "true" || config.ssl === "1") {
        config.ssl = true;
      }
      if (config.ssl === "0") {
        config.ssl = false;
      }
      if (config.sslcert || config.sslkey || config.sslrootcert || config.sslmode) {
        config.ssl = {};
      }
      const fs = config.sslcert || config.sslkey || config.sslrootcert ? require("fs") : null;
      if (config.sslcert) {
        config.ssl.cert = fs.readFileSync(config.sslcert).toString();
      }
      if (config.sslkey) {
        config.ssl.key = fs.readFileSync(config.sslkey).toString();
      }
      if (config.sslrootcert) {
        config.ssl.ca = fs.readFileSync(config.sslrootcert).toString();
      }
      switch (config.sslmode) {
        case "disable": {
          config.ssl = false;
          break;
        }
        case "prefer":
        case "require":
        case "verify-ca":
        case "verify-full": {
          break;
        }
        case "no-verify": {
          config.ssl.rejectUnauthorized = false;
          break;
        }
      }
      return config;
    }
    module2.exports = parse;
    parse.parse = parse;
  }
});

// node_modules/pg/lib/connection-parameters.js
var require_connection_parameters = __commonJS({
  "node_modules/pg/lib/connection-parameters.js"(exports, module2) {
    "use strict";
    var dns = require("dns");
    var defaults2 = require_defaults();
    var parse = require_pg_connection_string().parse;
    var val = function(key, config, envVar) {
      if (envVar === void 0) {
        envVar = process.env["PG" + key.toUpperCase()];
      } else if (envVar === false) {
      } else {
        envVar = process.env[envVar];
      }
      return config[key] || envVar || defaults2[key];
    };
    var readSSLConfigFromEnvironment = function() {
      switch (process.env.PGSSLMODE) {
        case "disable":
          return false;
        case "prefer":
        case "require":
        case "verify-ca":
        case "verify-full":
          return true;
        case "no-verify":
          return { rejectUnauthorized: false };
      }
      return defaults2.ssl;
    };
    var quoteParamValue = function(value) {
      return "'" + ("" + value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    };
    var add = function(params, config, paramName) {
      var value = config[paramName];
      if (value !== void 0 && value !== null) {
        params.push(paramName + "=" + quoteParamValue(value));
      }
    };
    var ConnectionParameters = class {
      constructor(config) {
        config = typeof config === "string" ? parse(config) : config || {};
        if (config.connectionString) {
          config = Object.assign({}, config, parse(config.connectionString));
        }
        this.user = val("user", config);
        this.database = val("database", config);
        if (this.database === void 0) {
          this.database = this.user;
        }
        this.port = parseInt(val("port", config), 10);
        this.host = val("host", config);
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: val("password", config)
        });
        this.binary = val("binary", config);
        this.options = val("options", config);
        this.ssl = typeof config.ssl === "undefined" ? readSSLConfigFromEnvironment() : config.ssl;
        if (typeof this.ssl === "string") {
          if (this.ssl === "true") {
            this.ssl = true;
          }
        }
        if (this.ssl === "no-verify") {
          this.ssl = { rejectUnauthorized: false };
        }
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this.client_encoding = val("client_encoding", config);
        this.replication = val("replication", config);
        this.isDomainSocket = !(this.host || "").indexOf("/");
        this.application_name = val("application_name", config, "PGAPPNAME");
        this.fallback_application_name = val("fallback_application_name", config, false);
        this.statement_timeout = val("statement_timeout", config, false);
        this.lock_timeout = val("lock_timeout", config, false);
        this.idle_in_transaction_session_timeout = val("idle_in_transaction_session_timeout", config, false);
        this.query_timeout = val("query_timeout", config, false);
        if (config.connectionTimeoutMillis === void 0) {
          this.connect_timeout = process.env.PGCONNECT_TIMEOUT || 0;
        } else {
          this.connect_timeout = Math.floor(config.connectionTimeoutMillis / 1e3);
        }
        if (config.keepAlive === false) {
          this.keepalives = 0;
        } else if (config.keepAlive === true) {
          this.keepalives = 1;
        }
        if (typeof config.keepAliveInitialDelayMillis === "number") {
          this.keepalives_idle = Math.floor(config.keepAliveInitialDelayMillis / 1e3);
        }
      }
      getLibpqConnectionString(cb) {
        var params = [];
        add(params, this, "user");
        add(params, this, "password");
        add(params, this, "port");
        add(params, this, "application_name");
        add(params, this, "fallback_application_name");
        add(params, this, "connect_timeout");
        add(params, this, "options");
        var ssl = typeof this.ssl === "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
        add(params, ssl, "sslmode");
        add(params, ssl, "sslca");
        add(params, ssl, "sslkey");
        add(params, ssl, "sslcert");
        add(params, ssl, "sslrootcert");
        if (this.database) {
          params.push("dbname=" + quoteParamValue(this.database));
        }
        if (this.replication) {
          params.push("replication=" + quoteParamValue(this.replication));
        }
        if (this.host) {
          params.push("host=" + quoteParamValue(this.host));
        }
        if (this.isDomainSocket) {
          return cb(null, params.join(" "));
        }
        if (this.client_encoding) {
          params.push("client_encoding=" + quoteParamValue(this.client_encoding));
        }
        dns.lookup(this.host, function(err, address) {
          if (err)
            return cb(err, null);
          params.push("hostaddr=" + quoteParamValue(address));
          return cb(null, params.join(" "));
        });
      }
    };
    module2.exports = ConnectionParameters;
  }
});

// node_modules/pg/lib/result.js
var require_result = __commonJS({
  "node_modules/pg/lib/result.js"(exports, module2) {
    "use strict";
    var types = require_pg_types();
    var matchRegexp = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/;
    var Result = class {
      constructor(rowMode, types2) {
        this.command = null;
        this.rowCount = null;
        this.oid = null;
        this.rows = [];
        this.fields = [];
        this._parsers = void 0;
        this._types = types2;
        this.RowCtor = null;
        this.rowAsArray = rowMode === "array";
        if (this.rowAsArray) {
          this.parseRow = this._parseRowAsArray;
        }
        this._prebuiltEmptyResultObject = null;
      }
      // adds a command complete message
      addCommandComplete(msg) {
        var match;
        if (msg.text) {
          match = matchRegexp.exec(msg.text);
        } else {
          match = matchRegexp.exec(msg.command);
        }
        if (match) {
          this.command = match[1];
          if (match[3]) {
            this.oid = parseInt(match[2], 10);
            this.rowCount = parseInt(match[3], 10);
          } else if (match[2]) {
            this.rowCount = parseInt(match[2], 10);
          }
        }
      }
      _parseRowAsArray(rowData) {
        var row = new Array(rowData.length);
        for (var i = 0, len = rowData.length; i < len; i++) {
          var rawValue = rowData[i];
          if (rawValue !== null) {
            row[i] = this._parsers[i](rawValue);
          } else {
            row[i] = null;
          }
        }
        return row;
      }
      parseRow(rowData) {
        var row = { ...this._prebuiltEmptyResultObject };
        for (var i = 0, len = rowData.length; i < len; i++) {
          var rawValue = rowData[i];
          var field = this.fields[i].name;
          if (rawValue !== null) {
            row[field] = this._parsers[i](rawValue);
          }
        }
        return row;
      }
      addRow(row) {
        this.rows.push(row);
      }
      addFields(fieldDescriptions) {
        this.fields = fieldDescriptions;
        if (this.fields.length) {
          this._parsers = new Array(fieldDescriptions.length);
        }
        for (var i = 0; i < fieldDescriptions.length; i++) {
          var desc = fieldDescriptions[i];
          if (this._types) {
            this._parsers[i] = this._types.getTypeParser(desc.dataTypeID, desc.format || "text");
          } else {
            this._parsers[i] = types.getTypeParser(desc.dataTypeID, desc.format || "text");
          }
        }
        this._createPrebuiltEmptyResultObject();
      }
      _createPrebuiltEmptyResultObject() {
        var row = {};
        for (var i = 0; i < this.fields.length; i++) {
          row[this.fields[i].name] = null;
        }
        this._prebuiltEmptyResultObject = { ...row };
      }
    };
    module2.exports = Result;
  }
});

// node_modules/pg/lib/query.js
var require_query = __commonJS({
  "node_modules/pg/lib/query.js"(exports, module2) {
    "use strict";
    var { EventEmitter } = require("events");
    var Result = require_result();
    var utils = require_utils2();
    var Query = class extends EventEmitter {
      constructor(config, values, callback) {
        super();
        config = utils.normalizeQueryConfig(config, values, callback);
        this.text = config.text;
        this.values = config.values;
        this.rows = config.rows;
        this.types = config.types;
        this.name = config.name;
        this.binary = config.binary;
        this.portal = config.portal || "";
        this.callback = config.callback;
        this._rowMode = config.rowMode;
        if (process.domain && config.callback) {
          this.callback = process.domain.bind(config.callback);
        }
        this._result = new Result(this._rowMode, this.types);
        this._results = this._result;
        this.isPreparedStatement = false;
        this._canceledDueToError = false;
        this._promise = null;
      }
      requiresPreparation() {
        if (this.name) {
          return true;
        }
        if (this.rows) {
          return true;
        }
        if (!this.text) {
          return false;
        }
        if (!this.values) {
          return false;
        }
        return this.values.length > 0;
      }
      _checkForMultirow() {
        if (this._result.command) {
          if (!Array.isArray(this._results)) {
            this._results = [this._result];
          }
          this._result = new Result(this._rowMode, this.types);
          this._results.push(this._result);
        }
      }
      // associates row metadata from the supplied
      // message with this query object
      // metadata used when parsing row results
      handleRowDescription(msg) {
        this._checkForMultirow();
        this._result.addFields(msg.fields);
        this._accumulateRows = this.callback || !this.listeners("row").length;
      }
      handleDataRow(msg) {
        let row;
        if (this._canceledDueToError) {
          return;
        }
        try {
          row = this._result.parseRow(msg.fields);
        } catch (err) {
          this._canceledDueToError = err;
          return;
        }
        this.emit("row", row, this._result);
        if (this._accumulateRows) {
          this._result.addRow(row);
        }
      }
      handleCommandComplete(msg, connection) {
        this._checkForMultirow();
        this._result.addCommandComplete(msg);
        if (this.rows) {
          connection.sync();
        }
      }
      // if a named prepared statement is created with empty query text
      // the backend will send an emptyQuery message but *not* a command complete message
      // since we pipeline sync immediately after execute we don't need to do anything here
      // unless we have rows specified, in which case we did not pipeline the intial sync call
      handleEmptyQuery(connection) {
        if (this.rows) {
          connection.sync();
        }
      }
      handleError(err, connection) {
        if (this._canceledDueToError) {
          err = this._canceledDueToError;
          this._canceledDueToError = false;
        }
        if (this.callback) {
          return this.callback(err);
        }
        this.emit("error", err);
      }
      handleReadyForQuery(con) {
        if (this._canceledDueToError) {
          return this.handleError(this._canceledDueToError, con);
        }
        if (this.callback) {
          try {
            this.callback(null, this._results);
          } catch (err) {
            process.nextTick(() => {
              throw err;
            });
          }
        }
        this.emit("end", this._results);
      }
      submit(connection) {
        if (typeof this.text !== "string" && typeof this.name !== "string") {
          return new Error("A query must have either text or a name. Supplying neither is unsupported.");
        }
        const previous = connection.parsedStatements[this.name];
        if (this.text && previous && this.text !== previous) {
          return new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
        }
        if (this.values && !Array.isArray(this.values)) {
          return new Error("Query values must be an array");
        }
        if (this.requiresPreparation()) {
          this.prepare(connection);
        } else {
          connection.query(this.text);
        }
        return null;
      }
      hasBeenParsed(connection) {
        return this.name && connection.parsedStatements[this.name];
      }
      handlePortalSuspended(connection) {
        this._getRows(connection, this.rows);
      }
      _getRows(connection, rows) {
        connection.execute({
          portal: this.portal,
          rows
        });
        if (!rows) {
          connection.sync();
        } else {
          connection.flush();
        }
      }
      // http://developer.postgresql.org/pgdocs/postgres/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY
      prepare(connection) {
        this.isPreparedStatement = true;
        if (!this.hasBeenParsed(connection)) {
          connection.parse({
            text: this.text,
            name: this.name,
            types: this.types
          });
        }
        try {
          connection.bind({
            portal: this.portal,
            statement: this.name,
            values: this.values,
            binary: this.binary,
            valueMapper: utils.prepareValue
          });
        } catch (err) {
          this.handleError(err, connection);
          return;
        }
        connection.describe({
          type: "P",
          name: this.portal || ""
        });
        this._getRows(connection, this.rows);
      }
      handleCopyInResponse(connection) {
        connection.sendCopyFail("No source stream defined");
      }
      // eslint-disable-next-line no-unused-vars
      handleCopyData(msg, connection) {
      }
    };
    module2.exports = Query;
  }
});

// node_modules/pg-protocol/dist/messages.js
var require_messages = __commonJS({
  "node_modules/pg-protocol/dist/messages.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NoticeMessage = exports.DataRowMessage = exports.CommandCompleteMessage = exports.ReadyForQueryMessage = exports.NotificationResponseMessage = exports.BackendKeyDataMessage = exports.AuthenticationMD5Password = exports.ParameterStatusMessage = exports.ParameterDescriptionMessage = exports.RowDescriptionMessage = exports.Field = exports.CopyResponse = exports.CopyDataMessage = exports.DatabaseError = exports.copyDone = exports.emptyQuery = exports.replicationStart = exports.portalSuspended = exports.noData = exports.closeComplete = exports.bindComplete = exports.parseComplete = void 0;
    exports.parseComplete = {
      name: "parseComplete",
      length: 5
    };
    exports.bindComplete = {
      name: "bindComplete",
      length: 5
    };
    exports.closeComplete = {
      name: "closeComplete",
      length: 5
    };
    exports.noData = {
      name: "noData",
      length: 5
    };
    exports.portalSuspended = {
      name: "portalSuspended",
      length: 5
    };
    exports.replicationStart = {
      name: "replicationStart",
      length: 4
    };
    exports.emptyQuery = {
      name: "emptyQuery",
      length: 4
    };
    exports.copyDone = {
      name: "copyDone",
      length: 4
    };
    var DatabaseError = class extends Error {
      constructor(message, length, name) {
        super(message);
        this.length = length;
        this.name = name;
      }
    };
    exports.DatabaseError = DatabaseError;
    var CopyDataMessage = class {
      constructor(length, chunk) {
        this.length = length;
        this.chunk = chunk;
        this.name = "copyData";
      }
    };
    exports.CopyDataMessage = CopyDataMessage;
    var CopyResponse = class {
      constructor(length, name, binary, columnCount) {
        this.length = length;
        this.name = name;
        this.binary = binary;
        this.columnTypes = new Array(columnCount);
      }
    };
    exports.CopyResponse = CopyResponse;
    var Field = class {
      constructor(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, format) {
        this.name = name;
        this.tableID = tableID;
        this.columnID = columnID;
        this.dataTypeID = dataTypeID;
        this.dataTypeSize = dataTypeSize;
        this.dataTypeModifier = dataTypeModifier;
        this.format = format;
      }
    };
    exports.Field = Field;
    var RowDescriptionMessage = class {
      constructor(length, fieldCount) {
        this.length = length;
        this.fieldCount = fieldCount;
        this.name = "rowDescription";
        this.fields = new Array(this.fieldCount);
      }
    };
    exports.RowDescriptionMessage = RowDescriptionMessage;
    var ParameterDescriptionMessage = class {
      constructor(length, parameterCount) {
        this.length = length;
        this.parameterCount = parameterCount;
        this.name = "parameterDescription";
        this.dataTypeIDs = new Array(this.parameterCount);
      }
    };
    exports.ParameterDescriptionMessage = ParameterDescriptionMessage;
    var ParameterStatusMessage = class {
      constructor(length, parameterName, parameterValue) {
        this.length = length;
        this.parameterName = parameterName;
        this.parameterValue = parameterValue;
        this.name = "parameterStatus";
      }
    };
    exports.ParameterStatusMessage = ParameterStatusMessage;
    var AuthenticationMD5Password = class {
      constructor(length, salt) {
        this.length = length;
        this.salt = salt;
        this.name = "authenticationMD5Password";
      }
    };
    exports.AuthenticationMD5Password = AuthenticationMD5Password;
    var BackendKeyDataMessage = class {
      constructor(length, processID, secretKey) {
        this.length = length;
        this.processID = processID;
        this.secretKey = secretKey;
        this.name = "backendKeyData";
      }
    };
    exports.BackendKeyDataMessage = BackendKeyDataMessage;
    var NotificationResponseMessage = class {
      constructor(length, processId, channel, payload) {
        this.length = length;
        this.processId = processId;
        this.channel = channel;
        this.payload = payload;
        this.name = "notification";
      }
    };
    exports.NotificationResponseMessage = NotificationResponseMessage;
    var ReadyForQueryMessage = class {
      constructor(length, status) {
        this.length = length;
        this.status = status;
        this.name = "readyForQuery";
      }
    };
    exports.ReadyForQueryMessage = ReadyForQueryMessage;
    var CommandCompleteMessage = class {
      constructor(length, text) {
        this.length = length;
        this.text = text;
        this.name = "commandComplete";
      }
    };
    exports.CommandCompleteMessage = CommandCompleteMessage;
    var DataRowMessage = class {
      constructor(length, fields) {
        this.length = length;
        this.fields = fields;
        this.name = "dataRow";
        this.fieldCount = fields.length;
      }
    };
    exports.DataRowMessage = DataRowMessage;
    var NoticeMessage = class {
      constructor(length, message) {
        this.length = length;
        this.message = message;
        this.name = "notice";
      }
    };
    exports.NoticeMessage = NoticeMessage;
  }
});

// node_modules/pg-protocol/dist/buffer-writer.js
var require_buffer_writer = __commonJS({
  "node_modules/pg-protocol/dist/buffer-writer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Writer = void 0;
    var Writer = class {
      constructor(size = 256) {
        this.size = size;
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(size);
      }
      ensure(size) {
        var remaining = this.buffer.length - this.offset;
        if (remaining < size) {
          var oldBuffer = this.buffer;
          var newSize = oldBuffer.length + (oldBuffer.length >> 1) + size;
          this.buffer = Buffer.allocUnsafe(newSize);
          oldBuffer.copy(this.buffer);
        }
      }
      addInt32(num) {
        this.ensure(4);
        this.buffer[this.offset++] = num >>> 24 & 255;
        this.buffer[this.offset++] = num >>> 16 & 255;
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addInt16(num) {
        this.ensure(2);
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addCString(string) {
        if (!string) {
          this.ensure(1);
        } else {
          var len = Buffer.byteLength(string);
          this.ensure(len + 1);
          this.buffer.write(string, this.offset, "utf-8");
          this.offset += len;
        }
        this.buffer[this.offset++] = 0;
        return this;
      }
      addString(string = "") {
        var len = Buffer.byteLength(string);
        this.ensure(len);
        this.buffer.write(string, this.offset);
        this.offset += len;
        return this;
      }
      add(otherBuffer) {
        this.ensure(otherBuffer.length);
        otherBuffer.copy(this.buffer, this.offset);
        this.offset += otherBuffer.length;
        return this;
      }
      join(code) {
        if (code) {
          this.buffer[this.headerPosition] = code;
          const length = this.offset - (this.headerPosition + 1);
          this.buffer.writeInt32BE(length, this.headerPosition + 1);
        }
        return this.buffer.slice(code ? 0 : 5, this.offset);
      }
      flush(code) {
        var result = this.join(code);
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(this.size);
        return result;
      }
    };
    exports.Writer = Writer;
  }
});

// node_modules/pg-protocol/dist/serializer.js
var require_serializer = __commonJS({
  "node_modules/pg-protocol/dist/serializer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.serialize = void 0;
    var buffer_writer_1 = require_buffer_writer();
    var writer = new buffer_writer_1.Writer();
    var startup = (opts) => {
      writer.addInt16(3).addInt16(0);
      for (const key of Object.keys(opts)) {
        writer.addCString(key).addCString(opts[key]);
      }
      writer.addCString("client_encoding").addCString("UTF8");
      var bodyBuffer = writer.addCString("").flush();
      var length = bodyBuffer.length + 4;
      return new buffer_writer_1.Writer().addInt32(length).add(bodyBuffer).flush();
    };
    var requestSsl = () => {
      const response = Buffer.allocUnsafe(8);
      response.writeInt32BE(8, 0);
      response.writeInt32BE(80877103, 4);
      return response;
    };
    var password = (password2) => {
      return writer.addCString(password2).flush(
        112
        /* startup */
      );
    };
    var sendSASLInitialResponseMessage = function(mechanism, initialResponse) {
      writer.addCString(mechanism).addInt32(Buffer.byteLength(initialResponse)).addString(initialResponse);
      return writer.flush(
        112
        /* startup */
      );
    };
    var sendSCRAMClientFinalMessage = function(additionalData) {
      return writer.addString(additionalData).flush(
        112
        /* startup */
      );
    };
    var query = (text) => {
      return writer.addCString(text).flush(
        81
        /* query */
      );
    };
    var emptyArray = [];
    var parse = (query2) => {
      const name = query2.name || "";
      if (name.length > 63) {
        console.error("Warning! Postgres only supports 63 characters for query names.");
        console.error("You supplied %s (%s)", name, name.length);
        console.error("This can cause conflicts and silent errors executing queries");
      }
      const types = query2.types || emptyArray;
      var len = types.length;
      var buffer = writer.addCString(name).addCString(query2.text).addInt16(len);
      for (var i = 0; i < len; i++) {
        buffer.addInt32(types[i]);
      }
      return writer.flush(
        80
        /* parse */
      );
    };
    var paramWriter = new buffer_writer_1.Writer();
    var writeValues = function(values, valueMapper) {
      for (let i = 0; i < values.length; i++) {
        const mappedVal = valueMapper ? valueMapper(values[i], i) : values[i];
        if (mappedVal == null) {
          writer.addInt16(
            0
            /* STRING */
          );
          paramWriter.addInt32(-1);
        } else if (mappedVal instanceof Buffer) {
          writer.addInt16(
            1
            /* BINARY */
          );
          paramWriter.addInt32(mappedVal.length);
          paramWriter.add(mappedVal);
        } else {
          writer.addInt16(
            0
            /* STRING */
          );
          paramWriter.addInt32(Buffer.byteLength(mappedVal));
          paramWriter.addString(mappedVal);
        }
      }
    };
    var bind = (config = {}) => {
      const portal = config.portal || "";
      const statement = config.statement || "";
      const binary = config.binary || false;
      const values = config.values || emptyArray;
      const len = values.length;
      writer.addCString(portal).addCString(statement);
      writer.addInt16(len);
      writeValues(values, config.valueMapper);
      writer.addInt16(len);
      writer.add(paramWriter.flush());
      writer.addInt16(
        binary ? 1 : 0
        /* STRING */
      );
      return writer.flush(
        66
        /* bind */
      );
    };
    var emptyExecute = Buffer.from([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]);
    var execute = (config) => {
      if (!config || !config.portal && !config.rows) {
        return emptyExecute;
      }
      const portal = config.portal || "";
      const rows = config.rows || 0;
      const portalLength = Buffer.byteLength(portal);
      const len = 4 + portalLength + 1 + 4;
      const buff = Buffer.allocUnsafe(1 + len);
      buff[0] = 69;
      buff.writeInt32BE(len, 1);
      buff.write(portal, 5, "utf-8");
      buff[portalLength + 5] = 0;
      buff.writeUInt32BE(rows, buff.length - 4);
      return buff;
    };
    var cancel = (processID, secretKey) => {
      const buffer = Buffer.allocUnsafe(16);
      buffer.writeInt32BE(16, 0);
      buffer.writeInt16BE(1234, 4);
      buffer.writeInt16BE(5678, 6);
      buffer.writeInt32BE(processID, 8);
      buffer.writeInt32BE(secretKey, 12);
      return buffer;
    };
    var cstringMessage = (code, string) => {
      const stringLen = Buffer.byteLength(string);
      const len = 4 + stringLen + 1;
      const buffer = Buffer.allocUnsafe(1 + len);
      buffer[0] = code;
      buffer.writeInt32BE(len, 1);
      buffer.write(string, 5, "utf-8");
      buffer[len] = 0;
      return buffer;
    };
    var emptyDescribePortal = writer.addCString("P").flush(
      68
      /* describe */
    );
    var emptyDescribeStatement = writer.addCString("S").flush(
      68
      /* describe */
    );
    var describe = (msg) => {
      return msg.name ? cstringMessage(68, `${msg.type}${msg.name || ""}`) : msg.type === "P" ? emptyDescribePortal : emptyDescribeStatement;
    };
    var close = (msg) => {
      const text = `${msg.type}${msg.name || ""}`;
      return cstringMessage(67, text);
    };
    var copyData = (chunk) => {
      return writer.add(chunk).flush(
        100
        /* copyFromChunk */
      );
    };
    var copyFail = (message) => {
      return cstringMessage(102, message);
    };
    var codeOnlyBuffer = (code) => Buffer.from([code, 0, 0, 0, 4]);
    var flushBuffer = codeOnlyBuffer(
      72
      /* flush */
    );
    var syncBuffer = codeOnlyBuffer(
      83
      /* sync */
    );
    var endBuffer = codeOnlyBuffer(
      88
      /* end */
    );
    var copyDoneBuffer = codeOnlyBuffer(
      99
      /* copyDone */
    );
    var serialize = {
      startup,
      password,
      requestSsl,
      sendSASLInitialResponseMessage,
      sendSCRAMClientFinalMessage,
      query,
      parse,
      bind,
      execute,
      describe,
      close,
      flush: () => flushBuffer,
      sync: () => syncBuffer,
      end: () => endBuffer,
      copyData,
      copyDone: () => copyDoneBuffer,
      copyFail,
      cancel
    };
    exports.serialize = serialize;
  }
});

// node_modules/pg-protocol/dist/buffer-reader.js
var require_buffer_reader = __commonJS({
  "node_modules/pg-protocol/dist/buffer-reader.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BufferReader = void 0;
    var emptyBuffer = Buffer.allocUnsafe(0);
    var BufferReader = class {
      constructor(offset = 0) {
        this.offset = offset;
        this.buffer = emptyBuffer;
        this.encoding = "utf-8";
      }
      setBuffer(offset, buffer) {
        this.offset = offset;
        this.buffer = buffer;
      }
      int16() {
        const result = this.buffer.readInt16BE(this.offset);
        this.offset += 2;
        return result;
      }
      byte() {
        const result = this.buffer[this.offset];
        this.offset++;
        return result;
      }
      int32() {
        const result = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      string(length) {
        const result = this.buffer.toString(this.encoding, this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
      cstring() {
        const start = this.offset;
        let end = start;
        while (this.buffer[end++] !== 0) {
        }
        this.offset = end;
        return this.buffer.toString(this.encoding, start, end - 1);
      }
      bytes(length) {
        const result = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
    };
    exports.BufferReader = BufferReader;
  }
});

// node_modules/pg-protocol/dist/parser.js
var require_parser = __commonJS({
  "node_modules/pg-protocol/dist/parser.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Parser = void 0;
    var messages_1 = require_messages();
    var buffer_reader_1 = require_buffer_reader();
    var assert_1 = __importDefault(require("assert"));
    var CODE_LENGTH = 1;
    var LEN_LENGTH = 4;
    var HEADER_LENGTH = CODE_LENGTH + LEN_LENGTH;
    var emptyBuffer = Buffer.allocUnsafe(0);
    var Parser = class {
      constructor(opts) {
        this.buffer = emptyBuffer;
        this.bufferLength = 0;
        this.bufferOffset = 0;
        this.reader = new buffer_reader_1.BufferReader();
        if ((opts === null || opts === void 0 ? void 0 : opts.mode) === "binary") {
          throw new Error("Binary mode not supported yet");
        }
        this.mode = (opts === null || opts === void 0 ? void 0 : opts.mode) || "text";
      }
      parse(buffer, callback) {
        this.mergeBuffer(buffer);
        const bufferFullLength = this.bufferOffset + this.bufferLength;
        let offset = this.bufferOffset;
        while (offset + HEADER_LENGTH <= bufferFullLength) {
          const code = this.buffer[offset];
          const length = this.buffer.readUInt32BE(offset + CODE_LENGTH);
          const fullMessageLength = CODE_LENGTH + length;
          if (fullMessageLength + offset <= bufferFullLength) {
            const message = this.handlePacket(offset + HEADER_LENGTH, code, length, this.buffer);
            callback(message);
            offset += fullMessageLength;
          } else {
            break;
          }
        }
        if (offset === bufferFullLength) {
          this.buffer = emptyBuffer;
          this.bufferLength = 0;
          this.bufferOffset = 0;
        } else {
          this.bufferLength = bufferFullLength - offset;
          this.bufferOffset = offset;
        }
      }
      mergeBuffer(buffer) {
        if (this.bufferLength > 0) {
          const newLength = this.bufferLength + buffer.byteLength;
          const newFullLength = newLength + this.bufferOffset;
          if (newFullLength > this.buffer.byteLength) {
            let newBuffer;
            if (newLength <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) {
              newBuffer = this.buffer;
            } else {
              let newBufferLength = this.buffer.byteLength * 2;
              while (newLength >= newBufferLength) {
                newBufferLength *= 2;
              }
              newBuffer = Buffer.allocUnsafe(newBufferLength);
            }
            this.buffer.copy(newBuffer, 0, this.bufferOffset, this.bufferOffset + this.bufferLength);
            this.buffer = newBuffer;
            this.bufferOffset = 0;
          }
          buffer.copy(this.buffer, this.bufferOffset + this.bufferLength);
          this.bufferLength = newLength;
        } else {
          this.buffer = buffer;
          this.bufferOffset = 0;
          this.bufferLength = buffer.byteLength;
        }
      }
      handlePacket(offset, code, length, bytes) {
        switch (code) {
          case 50:
            return messages_1.bindComplete;
          case 49:
            return messages_1.parseComplete;
          case 51:
            return messages_1.closeComplete;
          case 110:
            return messages_1.noData;
          case 115:
            return messages_1.portalSuspended;
          case 99:
            return messages_1.copyDone;
          case 87:
            return messages_1.replicationStart;
          case 73:
            return messages_1.emptyQuery;
          case 68:
            return this.parseDataRowMessage(offset, length, bytes);
          case 67:
            return this.parseCommandCompleteMessage(offset, length, bytes);
          case 90:
            return this.parseReadyForQueryMessage(offset, length, bytes);
          case 65:
            return this.parseNotificationMessage(offset, length, bytes);
          case 82:
            return this.parseAuthenticationResponse(offset, length, bytes);
          case 83:
            return this.parseParameterStatusMessage(offset, length, bytes);
          case 75:
            return this.parseBackendKeyData(offset, length, bytes);
          case 69:
            return this.parseErrorMessage(offset, length, bytes, "error");
          case 78:
            return this.parseErrorMessage(offset, length, bytes, "notice");
          case 84:
            return this.parseRowDescriptionMessage(offset, length, bytes);
          case 116:
            return this.parseParameterDescriptionMessage(offset, length, bytes);
          case 71:
            return this.parseCopyInMessage(offset, length, bytes);
          case 72:
            return this.parseCopyOutMessage(offset, length, bytes);
          case 100:
            return this.parseCopyData(offset, length, bytes);
          default:
            assert_1.default.fail(`unknown message code: ${code.toString(16)}`);
        }
      }
      parseReadyForQueryMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const status = this.reader.string(1);
        return new messages_1.ReadyForQueryMessage(length, status);
      }
      parseCommandCompleteMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const text = this.reader.cstring();
        return new messages_1.CommandCompleteMessage(length, text);
      }
      parseCopyData(offset, length, bytes) {
        const chunk = bytes.slice(offset, offset + (length - 4));
        return new messages_1.CopyDataMessage(length, chunk);
      }
      parseCopyInMessage(offset, length, bytes) {
        return this.parseCopyMessage(offset, length, bytes, "copyInResponse");
      }
      parseCopyOutMessage(offset, length, bytes) {
        return this.parseCopyMessage(offset, length, bytes, "copyOutResponse");
      }
      parseCopyMessage(offset, length, bytes, messageName) {
        this.reader.setBuffer(offset, bytes);
        const isBinary = this.reader.byte() !== 0;
        const columnCount = this.reader.int16();
        const message = new messages_1.CopyResponse(length, messageName, isBinary, columnCount);
        for (let i = 0; i < columnCount; i++) {
          message.columnTypes[i] = this.reader.int16();
        }
        return message;
      }
      parseNotificationMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const processId = this.reader.int32();
        const channel = this.reader.cstring();
        const payload = this.reader.cstring();
        return new messages_1.NotificationResponseMessage(length, processId, channel, payload);
      }
      parseRowDescriptionMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const fieldCount = this.reader.int16();
        const message = new messages_1.RowDescriptionMessage(length, fieldCount);
        for (let i = 0; i < fieldCount; i++) {
          message.fields[i] = this.parseField();
        }
        return message;
      }
      parseField() {
        const name = this.reader.cstring();
        const tableID = this.reader.int32();
        const columnID = this.reader.int16();
        const dataTypeID = this.reader.int32();
        const dataTypeSize = this.reader.int16();
        const dataTypeModifier = this.reader.int32();
        const mode = this.reader.int16() === 0 ? "text" : "binary";
        return new messages_1.Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode);
      }
      parseParameterDescriptionMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const parameterCount = this.reader.int16();
        const message = new messages_1.ParameterDescriptionMessage(length, parameterCount);
        for (let i = 0; i < parameterCount; i++) {
          message.dataTypeIDs[i] = this.reader.int32();
        }
        return message;
      }
      parseDataRowMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const fieldCount = this.reader.int16();
        const fields = new Array(fieldCount);
        for (let i = 0; i < fieldCount; i++) {
          const len = this.reader.int32();
          fields[i] = len === -1 ? null : this.reader.string(len);
        }
        return new messages_1.DataRowMessage(length, fields);
      }
      parseParameterStatusMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const name = this.reader.cstring();
        const value = this.reader.cstring();
        return new messages_1.ParameterStatusMessage(length, name, value);
      }
      parseBackendKeyData(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const processID = this.reader.int32();
        const secretKey = this.reader.int32();
        return new messages_1.BackendKeyDataMessage(length, processID, secretKey);
      }
      parseAuthenticationResponse(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const code = this.reader.int32();
        const message = {
          name: "authenticationOk",
          length
        };
        switch (code) {
          case 0:
            break;
          case 3:
            if (message.length === 8) {
              message.name = "authenticationCleartextPassword";
            }
            break;
          case 5:
            if (message.length === 12) {
              message.name = "authenticationMD5Password";
              const salt = this.reader.bytes(4);
              return new messages_1.AuthenticationMD5Password(length, salt);
            }
            break;
          case 10:
            message.name = "authenticationSASL";
            message.mechanisms = [];
            let mechanism;
            do {
              mechanism = this.reader.cstring();
              if (mechanism) {
                message.mechanisms.push(mechanism);
              }
            } while (mechanism);
            break;
          case 11:
            message.name = "authenticationSASLContinue";
            message.data = this.reader.string(length - 8);
            break;
          case 12:
            message.name = "authenticationSASLFinal";
            message.data = this.reader.string(length - 8);
            break;
          default:
            throw new Error("Unknown authenticationOk message type " + code);
        }
        return message;
      }
      parseErrorMessage(offset, length, bytes, name) {
        this.reader.setBuffer(offset, bytes);
        const fields = {};
        let fieldType = this.reader.string(1);
        while (fieldType !== "\0") {
          fields[fieldType] = this.reader.cstring();
          fieldType = this.reader.string(1);
        }
        const messageValue = fields.M;
        const message = name === "notice" ? new messages_1.NoticeMessage(length, messageValue) : new messages_1.DatabaseError(messageValue, length, name);
        message.severity = fields.S;
        message.code = fields.C;
        message.detail = fields.D;
        message.hint = fields.H;
        message.position = fields.P;
        message.internalPosition = fields.p;
        message.internalQuery = fields.q;
        message.where = fields.W;
        message.schema = fields.s;
        message.table = fields.t;
        message.column = fields.c;
        message.dataType = fields.d;
        message.constraint = fields.n;
        message.file = fields.F;
        message.line = fields.L;
        message.routine = fields.R;
        return message;
      }
    };
    exports.Parser = Parser;
  }
});

// node_modules/pg-protocol/dist/index.js
var require_dist = __commonJS({
  "node_modules/pg-protocol/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DatabaseError = exports.serialize = exports.parse = void 0;
    var messages_1 = require_messages();
    Object.defineProperty(exports, "DatabaseError", { enumerable: true, get: function() {
      return messages_1.DatabaseError;
    } });
    var serializer_1 = require_serializer();
    Object.defineProperty(exports, "serialize", { enumerable: true, get: function() {
      return serializer_1.serialize;
    } });
    var parser_1 = require_parser();
    function parse(stream, callback) {
      const parser = new parser_1.Parser();
      stream.on("data", (buffer) => parser.parse(buffer, callback));
      return new Promise((resolve) => stream.on("end", () => resolve()));
    }
    exports.parse = parse;
  }
});

// node_modules/pg-cloudflare/dist/empty.js
var empty_exports = {};
__export(empty_exports, {
  default: () => empty_default
});
var empty_default;
var init_empty = __esm({
  "node_modules/pg-cloudflare/dist/empty.js"() {
    empty_default = {};
  }
});

// node_modules/pg/lib/stream.js
var require_stream = __commonJS({
  "node_modules/pg/lib/stream.js"(exports, module2) {
    module2.exports.getStream = function getStream(ssl) {
      const net = require("net");
      if (typeof net.Socket === "function") {
        return new net.Socket();
      } else {
        const { CloudflareSocket } = (init_empty(), __toCommonJS(empty_exports));
        return new CloudflareSocket(ssl);
      }
    };
    module2.exports.getSecureStream = function getSecureStream(options) {
      var tls = require("tls");
      if (tls.connect) {
        return tls.connect(options);
      } else {
        options.socket.startTls(options);
        return options.socket;
      }
    };
  }
});

// node_modules/pg/lib/connection.js
var require_connection = __commonJS({
  "node_modules/pg/lib/connection.js"(exports, module2) {
    "use strict";
    var net = require("net");
    var EventEmitter = require("events").EventEmitter;
    var { parse, serialize } = require_dist();
    var { getStream, getSecureStream } = require_stream();
    var flushBuffer = serialize.flush();
    var syncBuffer = serialize.sync();
    var endBuffer = serialize.end();
    var Connection = class extends EventEmitter {
      constructor(config) {
        super();
        config = config || {};
        this.stream = config.stream || getStream(config.ssl);
        if (typeof this.stream === "function") {
          this.stream = this.stream(config);
        }
        this._keepAlive = config.keepAlive;
        this._keepAliveInitialDelayMillis = config.keepAliveInitialDelayMillis;
        this.lastBuffer = false;
        this.parsedStatements = {};
        this.ssl = config.ssl || false;
        this._ending = false;
        this._emitMessage = false;
        var self = this;
        this.on("newListener", function(eventName) {
          if (eventName === "message") {
            self._emitMessage = true;
          }
        });
      }
      connect(port, host) {
        var self = this;
        this._connecting = true;
        this.stream.setNoDelay(true);
        this.stream.connect(port, host);
        this.stream.once("connect", function() {
          if (self._keepAlive) {
            self.stream.setKeepAlive(true, self._keepAliveInitialDelayMillis);
          }
          self.emit("connect");
        });
        const reportStreamError = function(error) {
          if (self._ending && (error.code === "ECONNRESET" || error.code === "EPIPE")) {
            return;
          }
          self.emit("error", error);
        };
        this.stream.on("error", reportStreamError);
        this.stream.on("close", function() {
          self.emit("end");
        });
        if (!this.ssl) {
          return this.attachListeners(this.stream);
        }
        this.stream.once("data", function(buffer) {
          var responseCode = buffer.toString("utf8");
          switch (responseCode) {
            case "S":
              break;
            case "N":
              self.stream.end();
              return self.emit("error", new Error("The server does not support SSL connections"));
            default:
              self.stream.end();
              return self.emit("error", new Error("There was an error establishing an SSL connection"));
          }
          const options = {
            socket: self.stream
          };
          if (self.ssl !== true) {
            Object.assign(options, self.ssl);
            if ("key" in self.ssl) {
              options.key = self.ssl.key;
            }
          }
          var net2 = require("net");
          if (net2.isIP && net2.isIP(host) === 0) {
            options.servername = host;
          }
          try {
            self.stream = getSecureStream(options);
          } catch (err) {
            return self.emit("error", err);
          }
          self.attachListeners(self.stream);
          self.stream.on("error", reportStreamError);
          self.emit("sslconnect");
        });
      }
      attachListeners(stream) {
        parse(stream, (msg) => {
          var eventName = msg.name === "error" ? "errorMessage" : msg.name;
          if (this._emitMessage) {
            this.emit("message", msg);
          }
          this.emit(eventName, msg);
        });
      }
      requestSsl() {
        this.stream.write(serialize.requestSsl());
      }
      startup(config) {
        this.stream.write(serialize.startup(config));
      }
      cancel(processID, secretKey) {
        this._send(serialize.cancel(processID, secretKey));
      }
      password(password) {
        this._send(serialize.password(password));
      }
      sendSASLInitialResponseMessage(mechanism, initialResponse) {
        this._send(serialize.sendSASLInitialResponseMessage(mechanism, initialResponse));
      }
      sendSCRAMClientFinalMessage(additionalData) {
        this._send(serialize.sendSCRAMClientFinalMessage(additionalData));
      }
      _send(buffer) {
        if (!this.stream.writable) {
          return false;
        }
        return this.stream.write(buffer);
      }
      query(text) {
        this._send(serialize.query(text));
      }
      // send parse message
      parse(query) {
        this._send(serialize.parse(query));
      }
      // send bind message
      bind(config) {
        this._send(serialize.bind(config));
      }
      // send execute message
      execute(config) {
        this._send(serialize.execute(config));
      }
      flush() {
        if (this.stream.writable) {
          this.stream.write(flushBuffer);
        }
      }
      sync() {
        this._ending = true;
        this._send(syncBuffer);
      }
      ref() {
        this.stream.ref();
      }
      unref() {
        this.stream.unref();
      }
      end() {
        this._ending = true;
        if (!this._connecting || !this.stream.writable) {
          this.stream.end();
          return;
        }
        return this.stream.write(endBuffer, () => {
          this.stream.end();
        });
      }
      close(msg) {
        this._send(serialize.close(msg));
      }
      describe(msg) {
        this._send(serialize.describe(msg));
      }
      sendCopyFromChunk(chunk) {
        this._send(serialize.copyData(chunk));
      }
      endCopyFrom() {
        this._send(serialize.copyDone());
      }
      sendCopyFail(msg) {
        this._send(serialize.copyFail(msg));
      }
    };
    module2.exports = Connection;
  }
});

// node_modules/split2/index.js
var require_split2 = __commonJS({
  "node_modules/split2/index.js"(exports, module2) {
    "use strict";
    var { Transform } = require("stream");
    var { StringDecoder } = require("string_decoder");
    var kLast = Symbol("last");
    var kDecoder = Symbol("decoder");
    function transform(chunk, enc, cb) {
      let list;
      if (this.overflow) {
        const buf = this[kDecoder].write(chunk);
        list = buf.split(this.matcher);
        if (list.length === 1)
          return cb();
        list.shift();
        this.overflow = false;
      } else {
        this[kLast] += this[kDecoder].write(chunk);
        list = this[kLast].split(this.matcher);
      }
      this[kLast] = list.pop();
      for (let i = 0; i < list.length; i++) {
        try {
          push(this, this.mapper(list[i]));
        } catch (error) {
          return cb(error);
        }
      }
      this.overflow = this[kLast].length > this.maxLength;
      if (this.overflow && !this.skipOverflow) {
        cb(new Error("maximum buffer reached"));
        return;
      }
      cb();
    }
    function flush(cb) {
      this[kLast] += this[kDecoder].end();
      if (this[kLast]) {
        try {
          push(this, this.mapper(this[kLast]));
        } catch (error) {
          return cb(error);
        }
      }
      cb();
    }
    function push(self, val) {
      if (val !== void 0) {
        self.push(val);
      }
    }
    function noop(incoming) {
      return incoming;
    }
    function split(matcher, mapper, options) {
      matcher = matcher || /\r?\n/;
      mapper = mapper || noop;
      options = options || {};
      switch (arguments.length) {
        case 1:
          if (typeof matcher === "function") {
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof matcher === "object" && !(matcher instanceof RegExp) && !matcher[Symbol.split]) {
            options = matcher;
            matcher = /\r?\n/;
          }
          break;
        case 2:
          if (typeof matcher === "function") {
            options = mapper;
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof mapper === "object") {
            options = mapper;
            mapper = noop;
          }
      }
      options = Object.assign({}, options);
      options.autoDestroy = true;
      options.transform = transform;
      options.flush = flush;
      options.readableObjectMode = true;
      const stream = new Transform(options);
      stream[kLast] = "";
      stream[kDecoder] = new StringDecoder("utf8");
      stream.matcher = matcher;
      stream.mapper = mapper;
      stream.maxLength = options.maxLength;
      stream.skipOverflow = options.skipOverflow || false;
      stream.overflow = false;
      stream._destroy = function(err, cb) {
        this._writableState.errorEmitted = false;
        cb(err);
      };
      return stream;
    }
    module2.exports = split;
  }
});

// node_modules/pgpass/lib/helper.js
var require_helper = __commonJS({
  "node_modules/pgpass/lib/helper.js"(exports, module2) {
    "use strict";
    var path = require("path");
    var Stream = require("stream").Stream;
    var split = require_split2();
    var util = require("util");
    var defaultPort = 5432;
    var isWin = process.platform === "win32";
    var warnStream = process.stderr;
    var S_IRWXG = 56;
    var S_IRWXO = 7;
    var S_IFMT = 61440;
    var S_IFREG = 32768;
    function isRegFile(mode) {
      return (mode & S_IFMT) == S_IFREG;
    }
    var fieldNames = ["host", "port", "database", "user", "password"];
    var nrOfFields = fieldNames.length;
    var passKey = fieldNames[nrOfFields - 1];
    function warn() {
      var isWritable = warnStream instanceof Stream && true === warnStream.writable;
      if (isWritable) {
        var args = Array.prototype.slice.call(arguments).concat("\n");
        warnStream.write(util.format.apply(util, args));
      }
    }
    Object.defineProperty(module2.exports, "isWin", {
      get: function() {
        return isWin;
      },
      set: function(val) {
        isWin = val;
      }
    });
    module2.exports.warnTo = function(stream) {
      var old = warnStream;
      warnStream = stream;
      return old;
    };
    module2.exports.getFileName = function(rawEnv) {
      var env = rawEnv || process.env;
      var file = env.PGPASSFILE || (isWin ? path.join(env.APPDATA || "./", "postgresql", "pgpass.conf") : path.join(env.HOME || "./", ".pgpass"));
      return file;
    };
    module2.exports.usePgPass = function(stats, fname) {
      if (Object.prototype.hasOwnProperty.call(process.env, "PGPASSWORD")) {
        return false;
      }
      if (isWin) {
        return true;
      }
      fname = fname || "<unkn>";
      if (!isRegFile(stats.mode)) {
        warn('WARNING: password file "%s" is not a plain file', fname);
        return false;
      }
      if (stats.mode & (S_IRWXG | S_IRWXO)) {
        warn('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', fname);
        return false;
      }
      return true;
    };
    var matcher = module2.exports.match = function(connInfo, entry) {
      return fieldNames.slice(0, -1).reduce(function(prev, field, idx) {
        if (idx == 1) {
          if (Number(connInfo[field] || defaultPort) === Number(entry[field])) {
            return prev && true;
          }
        }
        return prev && (entry[field] === "*" || entry[field] === connInfo[field]);
      }, true);
    };
    module2.exports.getPassword = function(connInfo, stream, cb) {
      var pass;
      var lineStream = stream.pipe(split());
      function onLine(line) {
        var entry = parseLine(line);
        if (entry && isValidEntry(entry) && matcher(connInfo, entry)) {
          pass = entry[passKey];
          lineStream.end();
        }
      }
      var onEnd = function() {
        stream.destroy();
        cb(pass);
      };
      var onErr = function(err) {
        stream.destroy();
        warn("WARNING: error on reading file: %s", err);
        cb(void 0);
      };
      stream.on("error", onErr);
      lineStream.on("data", onLine).on("end", onEnd).on("error", onErr);
    };
    var parseLine = module2.exports.parseLine = function(line) {
      if (line.length < 11 || line.match(/^\s+#/)) {
        return null;
      }
      var curChar = "";
      var prevChar = "";
      var fieldIdx = 0;
      var startIdx = 0;
      var endIdx = 0;
      var obj = {};
      var isLastField = false;
      var addToObj = function(idx, i0, i1) {
        var field = line.substring(i0, i1);
        if (!Object.hasOwnProperty.call(process.env, "PGPASS_NO_DEESCAPE")) {
          field = field.replace(/\\([:\\])/g, "$1");
        }
        obj[fieldNames[idx]] = field;
      };
      for (var i = 0; i < line.length - 1; i += 1) {
        curChar = line.charAt(i + 1);
        prevChar = line.charAt(i);
        isLastField = fieldIdx == nrOfFields - 1;
        if (isLastField) {
          addToObj(fieldIdx, startIdx);
          break;
        }
        if (i >= 0 && curChar == ":" && prevChar !== "\\") {
          addToObj(fieldIdx, startIdx, i + 1);
          startIdx = i + 2;
          fieldIdx += 1;
        }
      }
      obj = Object.keys(obj).length === nrOfFields ? obj : null;
      return obj;
    };
    var isValidEntry = module2.exports.isValidEntry = function(entry) {
      var rules = {
        // host
        0: function(x) {
          return x.length > 0;
        },
        // port
        1: function(x) {
          if (x === "*") {
            return true;
          }
          x = Number(x);
          return isFinite(x) && x > 0 && x < 9007199254740992 && Math.floor(x) === x;
        },
        // database
        2: function(x) {
          return x.length > 0;
        },
        // username
        3: function(x) {
          return x.length > 0;
        },
        // password
        4: function(x) {
          return x.length > 0;
        }
      };
      for (var idx = 0; idx < fieldNames.length; idx += 1) {
        var rule = rules[idx];
        var value = entry[fieldNames[idx]] || "";
        var res = rule(value);
        if (!res) {
          return false;
        }
      }
      return true;
    };
  }
});

// node_modules/pgpass/lib/index.js
var require_lib = __commonJS({
  "node_modules/pgpass/lib/index.js"(exports, module2) {
    "use strict";
    var path = require("path");
    var fs = require("fs");
    var helper = require_helper();
    module2.exports = function(connInfo, cb) {
      var file = helper.getFileName();
      fs.stat(file, function(err, stat) {
        if (err || !helper.usePgPass(stat, file)) {
          return cb(void 0);
        }
        var st = fs.createReadStream(file);
        helper.getPassword(connInfo, st, cb);
      });
    };
    module2.exports.warnTo = helper.warnTo;
  }
});

// node_modules/pg/lib/client.js
var require_client = __commonJS({
  "node_modules/pg/lib/client.js"(exports, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var utils = require_utils2();
    var sasl = require_sasl();
    var TypeOverrides = require_type_overrides();
    var ConnectionParameters = require_connection_parameters();
    var Query = require_query();
    var defaults2 = require_defaults();
    var Connection = require_connection();
    var crypto3 = require_utils3();
    var Client = class extends EventEmitter {
      constructor(config) {
        super();
        this.connectionParameters = new ConnectionParameters(config);
        this.user = this.connectionParameters.user;
        this.database = this.connectionParameters.database;
        this.port = this.connectionParameters.port;
        this.host = this.connectionParameters.host;
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: this.connectionParameters.password
        });
        this.replication = this.connectionParameters.replication;
        var c = config || {};
        this._Promise = c.Promise || global.Promise;
        this._types = new TypeOverrides(c.types);
        this._ending = false;
        this._ended = false;
        this._connecting = false;
        this._connected = false;
        this._connectionError = false;
        this._queryable = true;
        this.connection = c.connection || new Connection({
          stream: c.stream,
          ssl: this.connectionParameters.ssl,
          keepAlive: c.keepAlive || false,
          keepAliveInitialDelayMillis: c.keepAliveInitialDelayMillis || 0,
          encoding: this.connectionParameters.client_encoding || "utf8"
        });
        this.queryQueue = [];
        this.binary = c.binary || defaults2.binary;
        this.processID = null;
        this.secretKey = null;
        this.ssl = this.connectionParameters.ssl || false;
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this._connectionTimeoutMillis = c.connectionTimeoutMillis || 0;
      }
      _errorAllQueries(err) {
        const enqueueError = (query) => {
          process.nextTick(() => {
            query.handleError(err, this.connection);
          });
        };
        if (this.activeQuery) {
          enqueueError(this.activeQuery);
          this.activeQuery = null;
        }
        this.queryQueue.forEach(enqueueError);
        this.queryQueue.length = 0;
      }
      _connect(callback) {
        var self = this;
        var con = this.connection;
        this._connectionCallback = callback;
        if (this._connecting || this._connected) {
          const err = new Error("Client has already been connected. You cannot reuse a client.");
          process.nextTick(() => {
            callback(err);
          });
          return;
        }
        this._connecting = true;
        this.connectionTimeoutHandle;
        if (this._connectionTimeoutMillis > 0) {
          this.connectionTimeoutHandle = setTimeout(() => {
            con._ending = true;
            con.stream.destroy(new Error("timeout expired"));
          }, this._connectionTimeoutMillis);
        }
        if (this.host && this.host.indexOf("/") === 0) {
          con.connect(this.host + "/.s.PGSQL." + this.port);
        } else {
          con.connect(this.port, this.host);
        }
        con.on("connect", function() {
          if (self.ssl) {
            con.requestSsl();
          } else {
            con.startup(self.getStartupConf());
          }
        });
        con.on("sslconnect", function() {
          con.startup(self.getStartupConf());
        });
        this._attachListeners(con);
        con.once("end", () => {
          const error = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
          clearTimeout(this.connectionTimeoutHandle);
          this._errorAllQueries(error);
          this._ended = true;
          if (!this._ending) {
            if (this._connecting && !this._connectionError) {
              if (this._connectionCallback) {
                this._connectionCallback(error);
              } else {
                this._handleErrorEvent(error);
              }
            } else if (!this._connectionError) {
              this._handleErrorEvent(error);
            }
          }
          process.nextTick(() => {
            this.emit("end");
          });
        });
      }
      connect(callback) {
        if (callback) {
          this._connect(callback);
          return;
        }
        return new this._Promise((resolve, reject) => {
          this._connect((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }
      _attachListeners(con) {
        con.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this));
        con.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this));
        con.on("authenticationSASL", this._handleAuthSASL.bind(this));
        con.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this));
        con.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this));
        con.on("backendKeyData", this._handleBackendKeyData.bind(this));
        con.on("error", this._handleErrorEvent.bind(this));
        con.on("errorMessage", this._handleErrorMessage.bind(this));
        con.on("readyForQuery", this._handleReadyForQuery.bind(this));
        con.on("notice", this._handleNotice.bind(this));
        con.on("rowDescription", this._handleRowDescription.bind(this));
        con.on("dataRow", this._handleDataRow.bind(this));
        con.on("portalSuspended", this._handlePortalSuspended.bind(this));
        con.on("emptyQuery", this._handleEmptyQuery.bind(this));
        con.on("commandComplete", this._handleCommandComplete.bind(this));
        con.on("parseComplete", this._handleParseComplete.bind(this));
        con.on("copyInResponse", this._handleCopyInResponse.bind(this));
        con.on("copyData", this._handleCopyData.bind(this));
        con.on("notification", this._handleNotification.bind(this));
      }
      // TODO(bmc): deprecate pgpass "built in" integration since this.password can be a function
      // it can be supplied by the user if required - this is a breaking change!
      _checkPgPass(cb) {
        const con = this.connection;
        if (typeof this.password === "function") {
          this._Promise.resolve().then(() => this.password()).then((pass) => {
            if (pass !== void 0) {
              if (typeof pass !== "string") {
                con.emit("error", new TypeError("Password must be a string"));
                return;
              }
              this.connectionParameters.password = this.password = pass;
            } else {
              this.connectionParameters.password = this.password = null;
            }
            cb();
          }).catch((err) => {
            con.emit("error", err);
          });
        } else if (this.password !== null) {
          cb();
        } else {
          try {
            const pgPass = require_lib();
            pgPass(this.connectionParameters, (pass) => {
              if (void 0 !== pass) {
                this.connectionParameters.password = this.password = pass;
              }
              cb();
            });
          } catch (e) {
            this.emit("error", e);
          }
        }
      }
      _handleAuthCleartextPassword(msg) {
        this._checkPgPass(() => {
          this.connection.password(this.password);
        });
      }
      _handleAuthMD5Password(msg) {
        this._checkPgPass(async () => {
          try {
            const hashedPassword = await crypto3.postgresMd5PasswordHash(this.user, this.password, msg.salt);
            this.connection.password(hashedPassword);
          } catch (e) {
            this.emit("error", e);
          }
        });
      }
      _handleAuthSASL(msg) {
        this._checkPgPass(() => {
          try {
            this.saslSession = sasl.startSession(msg.mechanisms);
            this.connection.sendSASLInitialResponseMessage(this.saslSession.mechanism, this.saslSession.response);
          } catch (err) {
            this.connection.emit("error", err);
          }
        });
      }
      async _handleAuthSASLContinue(msg) {
        try {
          await sasl.continueSession(this.saslSession, this.password, msg.data);
          this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleAuthSASLFinal(msg) {
        try {
          sasl.finalizeSession(this.saslSession, msg.data);
          this.saslSession = null;
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleBackendKeyData(msg) {
        this.processID = msg.processID;
        this.secretKey = msg.secretKey;
      }
      _handleReadyForQuery(msg) {
        if (this._connecting) {
          this._connecting = false;
          this._connected = true;
          clearTimeout(this.connectionTimeoutHandle);
          if (this._connectionCallback) {
            this._connectionCallback(null, this);
            this._connectionCallback = null;
          }
          this.emit("connect");
        }
        const { activeQuery } = this;
        this.activeQuery = null;
        this.readyForQuery = true;
        if (activeQuery) {
          activeQuery.handleReadyForQuery(this.connection);
        }
        this._pulseQueryQueue();
      }
      // if we receieve an error event or error message
      // during the connection process we handle it here
      _handleErrorWhileConnecting(err) {
        if (this._connectionError) {
          return;
        }
        this._connectionError = true;
        clearTimeout(this.connectionTimeoutHandle);
        if (this._connectionCallback) {
          return this._connectionCallback(err);
        }
        this.emit("error", err);
      }
      // if we're connected and we receive an error event from the connection
      // this means the socket is dead - do a hard abort of all queries and emit
      // the socket error on the client as well
      _handleErrorEvent(err) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(err);
        }
        this._queryable = false;
        this._errorAllQueries(err);
        this.emit("error", err);
      }
      // handle error messages from the postgres backend
      _handleErrorMessage(msg) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(msg);
        }
        const activeQuery = this.activeQuery;
        if (!activeQuery) {
          this._handleErrorEvent(msg);
          return;
        }
        this.activeQuery = null;
        activeQuery.handleError(msg, this.connection);
      }
      _handleRowDescription(msg) {
        this.activeQuery.handleRowDescription(msg);
      }
      _handleDataRow(msg) {
        this.activeQuery.handleDataRow(msg);
      }
      _handlePortalSuspended(msg) {
        this.activeQuery.handlePortalSuspended(this.connection);
      }
      _handleEmptyQuery(msg) {
        this.activeQuery.handleEmptyQuery(this.connection);
      }
      _handleCommandComplete(msg) {
        this.activeQuery.handleCommandComplete(msg, this.connection);
      }
      _handleParseComplete(msg) {
        if (this.activeQuery.name) {
          this.connection.parsedStatements[this.activeQuery.name] = this.activeQuery.text;
        }
      }
      _handleCopyInResponse(msg) {
        this.activeQuery.handleCopyInResponse(this.connection);
      }
      _handleCopyData(msg) {
        this.activeQuery.handleCopyData(msg, this.connection);
      }
      _handleNotification(msg) {
        this.emit("notification", msg);
      }
      _handleNotice(msg) {
        this.emit("notice", msg);
      }
      getStartupConf() {
        var params = this.connectionParameters;
        var data = {
          user: params.user,
          database: params.database
        };
        var appName = params.application_name || params.fallback_application_name;
        if (appName) {
          data.application_name = appName;
        }
        if (params.replication) {
          data.replication = "" + params.replication;
        }
        if (params.statement_timeout) {
          data.statement_timeout = String(parseInt(params.statement_timeout, 10));
        }
        if (params.lock_timeout) {
          data.lock_timeout = String(parseInt(params.lock_timeout, 10));
        }
        if (params.idle_in_transaction_session_timeout) {
          data.idle_in_transaction_session_timeout = String(parseInt(params.idle_in_transaction_session_timeout, 10));
        }
        if (params.options) {
          data.options = params.options;
        }
        return data;
      }
      cancel(client, query) {
        if (client.activeQuery === query) {
          var con = this.connection;
          if (this.host && this.host.indexOf("/") === 0) {
            con.connect(this.host + "/.s.PGSQL." + this.port);
          } else {
            con.connect(this.port, this.host);
          }
          con.on("connect", function() {
            con.cancel(client.processID, client.secretKey);
          });
        } else if (client.queryQueue.indexOf(query) !== -1) {
          client.queryQueue.splice(client.queryQueue.indexOf(query), 1);
        }
      }
      setTypeParser(oid, format, parseFn) {
        return this._types.setTypeParser(oid, format, parseFn);
      }
      getTypeParser(oid, format) {
        return this._types.getTypeParser(oid, format);
      }
      // escapeIdentifier and escapeLiteral moved to utility functions & exported
      // on PG
      // re-exported here for backwards compatibility
      escapeIdentifier(str) {
        return utils.escapeIdentifier(str);
      }
      escapeLiteral(str) {
        return utils.escapeLiteral(str);
      }
      _pulseQueryQueue() {
        if (this.readyForQuery === true) {
          this.activeQuery = this.queryQueue.shift();
          if (this.activeQuery) {
            this.readyForQuery = false;
            this.hasExecuted = true;
            const queryError = this.activeQuery.submit(this.connection);
            if (queryError) {
              process.nextTick(() => {
                this.activeQuery.handleError(queryError, this.connection);
                this.readyForQuery = true;
                this._pulseQueryQueue();
              });
            }
          } else if (this.hasExecuted) {
            this.activeQuery = null;
            this.emit("drain");
          }
        }
      }
      query(config, values, callback) {
        var query;
        var result;
        var readTimeout;
        var readTimeoutTimer;
        var queryCallback;
        if (config === null || config === void 0) {
          throw new TypeError("Client was passed a null or undefined query");
        } else if (typeof config.submit === "function") {
          readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
          result = query = config;
          if (typeof values === "function") {
            query.callback = query.callback || values;
          }
        } else {
          readTimeout = this.connectionParameters.query_timeout;
          query = new Query(config, values, callback);
          if (!query.callback) {
            result = new this._Promise((resolve, reject) => {
              query.callback = (err, res) => err ? reject(err) : resolve(res);
            }).catch((err) => {
              Error.captureStackTrace(err);
              throw err;
            });
          }
        }
        if (readTimeout) {
          queryCallback = query.callback;
          readTimeoutTimer = setTimeout(() => {
            var error = new Error("Query read timeout");
            process.nextTick(() => {
              query.handleError(error, this.connection);
            });
            queryCallback(error);
            query.callback = () => {
            };
            var index = this.queryQueue.indexOf(query);
            if (index > -1) {
              this.queryQueue.splice(index, 1);
            }
            this._pulseQueryQueue();
          }, readTimeout);
          query.callback = (err, res) => {
            clearTimeout(readTimeoutTimer);
            queryCallback(err, res);
          };
        }
        if (this.binary && !query.binary) {
          query.binary = true;
        }
        if (query._result && !query._result._types) {
          query._result._types = this._types;
        }
        if (!this._queryable) {
          process.nextTick(() => {
            query.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._ending) {
          process.nextTick(() => {
            query.handleError(new Error("Client was closed and is not queryable"), this.connection);
          });
          return result;
        }
        this.queryQueue.push(query);
        this._pulseQueryQueue();
        return result;
      }
      ref() {
        this.connection.ref();
      }
      unref() {
        this.connection.unref();
      }
      end(cb) {
        this._ending = true;
        if (!this.connection._connecting || this._ended) {
          if (cb) {
            cb();
          } else {
            return this._Promise.resolve();
          }
        }
        if (this.activeQuery || !this._queryable) {
          this.connection.stream.destroy();
        } else {
          this.connection.end();
        }
        if (cb) {
          this.connection.once("end", cb);
        } else {
          return new this._Promise((resolve) => {
            this.connection.once("end", resolve);
          });
        }
      }
    };
    Client.Query = Query;
    module2.exports = Client;
  }
});

// node_modules/pg-pool/index.js
var require_pg_pool = __commonJS({
  "node_modules/pg-pool/index.js"(exports, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var NOOP = function() {
    };
    var removeWhere = (list, predicate) => {
      const i = list.findIndex(predicate);
      return i === -1 ? void 0 : list.splice(i, 1)[0];
    };
    var IdleItem = class {
      constructor(client, idleListener, timeoutId) {
        this.client = client;
        this.idleListener = idleListener;
        this.timeoutId = timeoutId;
      }
    };
    var PendingItem = class {
      constructor(callback) {
        this.callback = callback;
      }
    };
    function throwOnDoubleRelease() {
      throw new Error("Release called on client which has already been released to the pool.");
    }
    function promisify(Promise2, callback) {
      if (callback) {
        return { callback, result: void 0 };
      }
      let rej;
      let res;
      const cb = function(err, client) {
        err ? rej(err) : res(client);
      };
      const result = new Promise2(function(resolve, reject) {
        res = resolve;
        rej = reject;
      }).catch((err) => {
        Error.captureStackTrace(err);
        throw err;
      });
      return { callback: cb, result };
    }
    function makeIdleListener(pool2, client) {
      return function idleListener(err) {
        err.client = client;
        client.removeListener("error", idleListener);
        client.on("error", () => {
          pool2.log("additional client error after disconnection due to error", err);
        });
        pool2._remove(client);
        pool2.emit("error", err, client);
      };
    }
    var Pool = class extends EventEmitter {
      constructor(options, Client) {
        super();
        this.options = Object.assign({}, options);
        if (options != null && "password" in options) {
          Object.defineProperty(this.options, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: options.password
          });
        }
        if (options != null && options.ssl && options.ssl.key) {
          Object.defineProperty(this.options.ssl, "key", {
            enumerable: false
          });
        }
        this.options.max = this.options.max || this.options.poolSize || 10;
        this.options.maxUses = this.options.maxUses || Infinity;
        this.options.allowExitOnIdle = this.options.allowExitOnIdle || false;
        this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0;
        this.log = this.options.log || function() {
        };
        this.Client = this.options.Client || Client || require_lib2().Client;
        this.Promise = this.options.Promise || global.Promise;
        if (typeof this.options.idleTimeoutMillis === "undefined") {
          this.options.idleTimeoutMillis = 1e4;
        }
        this._clients = [];
        this._idle = [];
        this._expired = /* @__PURE__ */ new WeakSet();
        this._pendingQueue = [];
        this._endCallback = void 0;
        this.ending = false;
        this.ended = false;
      }
      _isFull() {
        return this._clients.length >= this.options.max;
      }
      _pulseQueue() {
        this.log("pulse queue");
        if (this.ended) {
          this.log("pulse queue ended");
          return;
        }
        if (this.ending) {
          this.log("pulse queue on ending");
          if (this._idle.length) {
            this._idle.slice().map((item) => {
              this._remove(item.client);
            });
          }
          if (!this._clients.length) {
            this.ended = true;
            this._endCallback();
          }
          return;
        }
        if (!this._pendingQueue.length) {
          this.log("no queued requests");
          return;
        }
        if (!this._idle.length && this._isFull()) {
          return;
        }
        const pendingItem = this._pendingQueue.shift();
        if (this._idle.length) {
          const idleItem = this._idle.pop();
          clearTimeout(idleItem.timeoutId);
          const client = idleItem.client;
          client.ref && client.ref();
          const idleListener = idleItem.idleListener;
          return this._acquireClient(client, pendingItem, idleListener, false);
        }
        if (!this._isFull()) {
          return this.newClient(pendingItem);
        }
        throw new Error("unexpected condition");
      }
      _remove(client) {
        const removed = removeWhere(this._idle, (item) => item.client === client);
        if (removed !== void 0) {
          clearTimeout(removed.timeoutId);
        }
        this._clients = this._clients.filter((c) => c !== client);
        client.end();
        this.emit("remove", client);
      }
      connect(cb) {
        if (this.ending) {
          const err = new Error("Cannot use a pool after calling end on the pool");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        const response = promisify(this.Promise, cb);
        const result = response.result;
        if (this._isFull() || this._idle.length) {
          if (this._idle.length) {
            process.nextTick(() => this._pulseQueue());
          }
          if (!this.options.connectionTimeoutMillis) {
            this._pendingQueue.push(new PendingItem(response.callback));
            return result;
          }
          const queueCallback = (err, res, done) => {
            clearTimeout(tid);
            response.callback(err, res, done);
          };
          const pendingItem = new PendingItem(queueCallback);
          const tid = setTimeout(() => {
            removeWhere(this._pendingQueue, (i) => i.callback === queueCallback);
            pendingItem.timedOut = true;
            response.callback(new Error("timeout exceeded when trying to connect"));
          }, this.options.connectionTimeoutMillis);
          this._pendingQueue.push(pendingItem);
          return result;
        }
        this.newClient(new PendingItem(response.callback));
        return result;
      }
      newClient(pendingItem) {
        const client = new this.Client(this.options);
        this._clients.push(client);
        const idleListener = makeIdleListener(this, client);
        this.log("checking client timeout");
        let tid;
        let timeoutHit = false;
        if (this.options.connectionTimeoutMillis) {
          tid = setTimeout(() => {
            this.log("ending client due to timeout");
            timeoutHit = true;
            client.connection ? client.connection.stream.destroy() : client.end();
          }, this.options.connectionTimeoutMillis);
        }
        this.log("connecting new client");
        client.connect((err) => {
          if (tid) {
            clearTimeout(tid);
          }
          client.on("error", idleListener);
          if (err) {
            this.log("client failed to connect", err);
            this._clients = this._clients.filter((c) => c !== client);
            if (timeoutHit) {
              err.message = "Connection terminated due to connection timeout";
            }
            this._pulseQueue();
            if (!pendingItem.timedOut) {
              pendingItem.callback(err, void 0, NOOP);
            }
          } else {
            this.log("new client connected");
            if (this.options.maxLifetimeSeconds !== 0) {
              const maxLifetimeTimeout = setTimeout(() => {
                this.log("ending client due to expired lifetime");
                this._expired.add(client);
                const idleIndex = this._idle.findIndex((idleItem) => idleItem.client === client);
                if (idleIndex !== -1) {
                  this._acquireClient(
                    client,
                    new PendingItem((err2, client2, clientRelease) => clientRelease()),
                    idleListener,
                    false
                  );
                }
              }, this.options.maxLifetimeSeconds * 1e3);
              maxLifetimeTimeout.unref();
              client.once("end", () => clearTimeout(maxLifetimeTimeout));
            }
            return this._acquireClient(client, pendingItem, idleListener, true);
          }
        });
      }
      // acquire a client for a pending work item
      _acquireClient(client, pendingItem, idleListener, isNew) {
        if (isNew) {
          this.emit("connect", client);
        }
        this.emit("acquire", client);
        client.release = this._releaseOnce(client, idleListener);
        client.removeListener("error", idleListener);
        if (!pendingItem.timedOut) {
          if (isNew && this.options.verify) {
            this.options.verify(client, (err) => {
              if (err) {
                client.release(err);
                return pendingItem.callback(err, void 0, NOOP);
              }
              pendingItem.callback(void 0, client, client.release);
            });
          } else {
            pendingItem.callback(void 0, client, client.release);
          }
        } else {
          if (isNew && this.options.verify) {
            this.options.verify(client, client.release);
          } else {
            client.release();
          }
        }
      }
      // returns a function that wraps _release and throws if called more than once
      _releaseOnce(client, idleListener) {
        let released = false;
        return (err) => {
          if (released) {
            throwOnDoubleRelease();
          }
          released = true;
          this._release(client, idleListener, err);
        };
      }
      // release a client back to the poll, include an error
      // to remove it from the pool
      _release(client, idleListener, err) {
        client.on("error", idleListener);
        client._poolUseCount = (client._poolUseCount || 0) + 1;
        this.emit("release", err, client);
        if (err || this.ending || !client._queryable || client._ending || client._poolUseCount >= this.options.maxUses) {
          if (client._poolUseCount >= this.options.maxUses) {
            this.log("remove expended client");
          }
          this._remove(client);
          this._pulseQueue();
          return;
        }
        const isExpired = this._expired.has(client);
        if (isExpired) {
          this.log("remove expired client");
          this._expired.delete(client);
          this._remove(client);
          this._pulseQueue();
          return;
        }
        let tid;
        if (this.options.idleTimeoutMillis) {
          tid = setTimeout(() => {
            this.log("remove idle client");
            this._remove(client);
          }, this.options.idleTimeoutMillis);
          if (this.options.allowExitOnIdle) {
            tid.unref();
          }
        }
        if (this.options.allowExitOnIdle) {
          client.unref();
        }
        this._idle.push(new IdleItem(client, idleListener, tid));
        this._pulseQueue();
      }
      query(text, values, cb) {
        if (typeof text === "function") {
          const response2 = promisify(this.Promise, text);
          setImmediate(function() {
            return response2.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
          });
          return response2.result;
        }
        if (typeof values === "function") {
          cb = values;
          values = void 0;
        }
        const response = promisify(this.Promise, cb);
        cb = response.callback;
        this.connect((err, client) => {
          if (err) {
            return cb(err);
          }
          let clientReleased = false;
          const onError = (err2) => {
            if (clientReleased) {
              return;
            }
            clientReleased = true;
            client.release(err2);
            cb(err2);
          };
          client.once("error", onError);
          this.log("dispatching query");
          try {
            client.query(text, values, (err2, res) => {
              this.log("query dispatched");
              client.removeListener("error", onError);
              if (clientReleased) {
                return;
              }
              clientReleased = true;
              client.release(err2);
              if (err2) {
                return cb(err2);
              }
              return cb(void 0, res);
            });
          } catch (err2) {
            client.release(err2);
            return cb(err2);
          }
        });
        return response.result;
      }
      end(cb) {
        this.log("ending");
        if (this.ending) {
          const err = new Error("Called end on pool more than once");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        this.ending = true;
        const promised = promisify(this.Promise, cb);
        this._endCallback = promised.callback;
        this._pulseQueue();
        return promised.result;
      }
      get waitingCount() {
        return this._pendingQueue.length;
      }
      get idleCount() {
        return this._idle.length;
      }
      get expiredCount() {
        return this._clients.reduce((acc, client) => acc + (this._expired.has(client) ? 1 : 0), 0);
      }
      get totalCount() {
        return this._clients.length;
      }
    };
    module2.exports = Pool;
  }
});

// node_modules/pg/lib/native/query.js
var require_query2 = __commonJS({
  "node_modules/pg/lib/native/query.js"(exports, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var util = require("util");
    var utils = require_utils2();
    var NativeQuery = module2.exports = function(config, values, callback) {
      EventEmitter.call(this);
      config = utils.normalizeQueryConfig(config, values, callback);
      this.text = config.text;
      this.values = config.values;
      this.name = config.name;
      this.callback = config.callback;
      this.state = "new";
      this._arrayMode = config.rowMode === "array";
      this._emitRowEvents = false;
      this.on(
        "newListener",
        function(event) {
          if (event === "row")
            this._emitRowEvents = true;
        }.bind(this)
      );
    };
    util.inherits(NativeQuery, EventEmitter);
    var errorFieldMap = {
      /* eslint-disable quote-props */
      sqlState: "code",
      statementPosition: "position",
      messagePrimary: "message",
      context: "where",
      schemaName: "schema",
      tableName: "table",
      columnName: "column",
      dataTypeName: "dataType",
      constraintName: "constraint",
      sourceFile: "file",
      sourceLine: "line",
      sourceFunction: "routine"
    };
    NativeQuery.prototype.handleError = function(err) {
      var fields = this.native.pq.resultErrorFields();
      if (fields) {
        for (var key in fields) {
          var normalizedFieldName = errorFieldMap[key] || key;
          err[normalizedFieldName] = fields[key];
        }
      }
      if (this.callback) {
        this.callback(err);
      } else {
        this.emit("error", err);
      }
      this.state = "error";
    };
    NativeQuery.prototype.then = function(onSuccess, onFailure) {
      return this._getPromise().then(onSuccess, onFailure);
    };
    NativeQuery.prototype.catch = function(callback) {
      return this._getPromise().catch(callback);
    };
    NativeQuery.prototype._getPromise = function() {
      if (this._promise)
        return this._promise;
      this._promise = new Promise(
        function(resolve, reject) {
          this._once("end", resolve);
          this._once("error", reject);
        }.bind(this)
      );
      return this._promise;
    };
    NativeQuery.prototype.submit = function(client) {
      this.state = "running";
      var self = this;
      this.native = client.native;
      client.native.arrayMode = this._arrayMode;
      var after = function(err, rows, results) {
        client.native.arrayMode = false;
        setImmediate(function() {
          self.emit("_done");
        });
        if (err) {
          return self.handleError(err);
        }
        if (self._emitRowEvents) {
          if (results.length > 1) {
            rows.forEach((rowOfRows, i) => {
              rowOfRows.forEach((row) => {
                self.emit("row", row, results[i]);
              });
            });
          } else {
            rows.forEach(function(row) {
              self.emit("row", row, results);
            });
          }
        }
        self.state = "end";
        self.emit("end", results);
        if (self.callback) {
          self.callback(null, results);
        }
      };
      if (process.domain) {
        after = process.domain.bind(after);
      }
      if (this.name) {
        if (this.name.length > 63) {
          console.error("Warning! Postgres only supports 63 characters for query names.");
          console.error("You supplied %s (%s)", this.name, this.name.length);
          console.error("This can cause conflicts and silent errors executing queries");
        }
        var values = (this.values || []).map(utils.prepareValue);
        if (client.namedQueries[this.name]) {
          if (this.text && client.namedQueries[this.name] !== this.text) {
            const err = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
            return after(err);
          }
          return client.native.execute(this.name, values, after);
        }
        return client.native.prepare(this.name, this.text, values.length, function(err) {
          if (err)
            return after(err);
          client.namedQueries[self.name] = self.text;
          return self.native.execute(self.name, values, after);
        });
      } else if (this.values) {
        if (!Array.isArray(this.values)) {
          const err = new Error("Query values must be an array");
          return after(err);
        }
        var vals = this.values.map(utils.prepareValue);
        client.native.query(this.text, vals, after);
      } else {
        client.native.query(this.text, after);
      }
    };
  }
});

// node_modules/pg/lib/native/client.js
var require_client2 = __commonJS({
  "node_modules/pg/lib/native/client.js"(exports, module2) {
    "use strict";
    var Native;
    try {
      Native = require("pg-native");
    } catch (e) {
      throw e;
    }
    var TypeOverrides = require_type_overrides();
    var EventEmitter = require("events").EventEmitter;
    var util = require("util");
    var ConnectionParameters = require_connection_parameters();
    var NativeQuery = require_query2();
    var Client = module2.exports = function(config) {
      EventEmitter.call(this);
      config = config || {};
      this._Promise = config.Promise || global.Promise;
      this._types = new TypeOverrides(config.types);
      this.native = new Native({
        types: this._types
      });
      this._queryQueue = [];
      this._ending = false;
      this._connecting = false;
      this._connected = false;
      this._queryable = true;
      var cp = this.connectionParameters = new ConnectionParameters(config);
      if (config.nativeConnectionString)
        cp.nativeConnectionString = config.nativeConnectionString;
      this.user = cp.user;
      Object.defineProperty(this, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: cp.password
      });
      this.database = cp.database;
      this.host = cp.host;
      this.port = cp.port;
      this.namedQueries = {};
    };
    Client.Query = NativeQuery;
    util.inherits(Client, EventEmitter);
    Client.prototype._errorAllQueries = function(err) {
      const enqueueError = (query) => {
        process.nextTick(() => {
          query.native = this.native;
          query.handleError(err);
        });
      };
      if (this._hasActiveQuery()) {
        enqueueError(this._activeQuery);
        this._activeQuery = null;
      }
      this._queryQueue.forEach(enqueueError);
      this._queryQueue.length = 0;
    };
    Client.prototype._connect = function(cb) {
      var self = this;
      if (this._connecting) {
        process.nextTick(() => cb(new Error("Client has already been connected. You cannot reuse a client.")));
        return;
      }
      this._connecting = true;
      this.connectionParameters.getLibpqConnectionString(function(err, conString) {
        if (self.connectionParameters.nativeConnectionString)
          conString = self.connectionParameters.nativeConnectionString;
        if (err)
          return cb(err);
        self.native.connect(conString, function(err2) {
          if (err2) {
            self.native.end();
            return cb(err2);
          }
          self._connected = true;
          self.native.on("error", function(err3) {
            self._queryable = false;
            self._errorAllQueries(err3);
            self.emit("error", err3);
          });
          self.native.on("notification", function(msg) {
            self.emit("notification", {
              channel: msg.relname,
              payload: msg.extra
            });
          });
          self.emit("connect");
          self._pulseQueryQueue(true);
          cb();
        });
      });
    };
    Client.prototype.connect = function(callback) {
      if (callback) {
        this._connect(callback);
        return;
      }
      return new this._Promise((resolve, reject) => {
        this._connect((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    };
    Client.prototype.query = function(config, values, callback) {
      var query;
      var result;
      var readTimeout;
      var readTimeoutTimer;
      var queryCallback;
      if (config === null || config === void 0) {
        throw new TypeError("Client was passed a null or undefined query");
      } else if (typeof config.submit === "function") {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        result = query = config;
        if (typeof values === "function") {
          config.callback = values;
        }
      } else {
        readTimeout = this.connectionParameters.query_timeout;
        query = new NativeQuery(config, values, callback);
        if (!query.callback) {
          let resolveOut, rejectOut;
          result = new this._Promise((resolve, reject) => {
            resolveOut = resolve;
            rejectOut = reject;
          }).catch((err) => {
            Error.captureStackTrace(err);
            throw err;
          });
          query.callback = (err, res) => err ? rejectOut(err) : resolveOut(res);
        }
      }
      if (readTimeout) {
        queryCallback = query.callback;
        readTimeoutTimer = setTimeout(() => {
          var error = new Error("Query read timeout");
          process.nextTick(() => {
            query.handleError(error, this.connection);
          });
          queryCallback(error);
          query.callback = () => {
          };
          var index = this._queryQueue.indexOf(query);
          if (index > -1) {
            this._queryQueue.splice(index, 1);
          }
          this._pulseQueryQueue();
        }, readTimeout);
        query.callback = (err, res) => {
          clearTimeout(readTimeoutTimer);
          queryCallback(err, res);
        };
      }
      if (!this._queryable) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client has encountered a connection error and is not queryable"));
        });
        return result;
      }
      if (this._ending) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client was closed and is not queryable"));
        });
        return result;
      }
      this._queryQueue.push(query);
      this._pulseQueryQueue();
      return result;
    };
    Client.prototype.end = function(cb) {
      var self = this;
      this._ending = true;
      if (!this._connected) {
        this.once("connect", this.end.bind(this, cb));
      }
      var result;
      if (!cb) {
        result = new this._Promise(function(resolve, reject) {
          cb = (err) => err ? reject(err) : resolve();
        });
      }
      this.native.end(function() {
        self._errorAllQueries(new Error("Connection terminated"));
        process.nextTick(() => {
          self.emit("end");
          if (cb)
            cb();
        });
      });
      return result;
    };
    Client.prototype._hasActiveQuery = function() {
      return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
    };
    Client.prototype._pulseQueryQueue = function(initialConnection) {
      if (!this._connected) {
        return;
      }
      if (this._hasActiveQuery()) {
        return;
      }
      var query = this._queryQueue.shift();
      if (!query) {
        if (!initialConnection) {
          this.emit("drain");
        }
        return;
      }
      this._activeQuery = query;
      query.submit(this);
      var self = this;
      query.once("_done", function() {
        self._pulseQueryQueue();
      });
    };
    Client.prototype.cancel = function(query) {
      if (this._activeQuery === query) {
        this.native.cancel(function() {
        });
      } else if (this._queryQueue.indexOf(query) !== -1) {
        this._queryQueue.splice(this._queryQueue.indexOf(query), 1);
      }
    };
    Client.prototype.ref = function() {
    };
    Client.prototype.unref = function() {
    };
    Client.prototype.setTypeParser = function(oid, format, parseFn) {
      return this._types.setTypeParser(oid, format, parseFn);
    };
    Client.prototype.getTypeParser = function(oid, format) {
      return this._types.getTypeParser(oid, format);
    };
  }
});

// node_modules/pg/lib/native/index.js
var require_native = __commonJS({
  "node_modules/pg/lib/native/index.js"(exports, module2) {
    "use strict";
    module2.exports = require_client2();
  }
});

// node_modules/pg/lib/index.js
var require_lib2 = __commonJS({
  "node_modules/pg/lib/index.js"(exports, module2) {
    "use strict";
    var Client = require_client();
    var defaults2 = require_defaults();
    var Connection = require_connection();
    var Pool = require_pg_pool();
    var { DatabaseError } = require_dist();
    var { escapeIdentifier, escapeLiteral } = require_utils2();
    var poolFactory = (Client2) => {
      return class BoundPool extends Pool {
        constructor(options) {
          super(options, Client2);
        }
      };
    };
    var PG = function(clientConstructor) {
      this.defaults = defaults2;
      this.Client = clientConstructor;
      this.Query = this.Client.Query;
      this.Pool = poolFactory(this.Client);
      this._pools = [];
      this.Connection = Connection;
      this.types = require_pg_types();
      this.DatabaseError = DatabaseError;
      this.escapeIdentifier = escapeIdentifier;
      this.escapeLiteral = escapeLiteral;
    };
    if (typeof process.env.NODE_PG_FORCE_NATIVE !== "undefined") {
      module2.exports = new PG(require_native());
    } else {
      module2.exports = new PG(Client);
      Object.defineProperty(module2.exports, "native", {
        configurable: true,
        enumerable: false,
        get() {
          var native = null;
          try {
            native = new PG(require_native());
          } catch (err) {
            if (err.code !== "MODULE_NOT_FOUND") {
              throw err;
            }
          }
          Object.defineProperty(module2.exports, "native", {
            value: native
          });
          return native;
        }
      });
    }
  }
});

// node_modules/serverless-postgres/src/index.js
var require_src = __commonJS({
  "node_modules/serverless-postgres/src/index.js"(exports, module2) {
    var { isValidStrategy, type, validateNum, isWithinRange } = require_utils();
    var Postgres = require_postgres();
    function ServerlessClient(config) {
      this._client = null;
      if (config.plugin) {
        this._plugin = config.plugin;
      } else {
        this._plugin = new Postgres();
      }
      this.setConfig(config);
    }
    ServerlessClient.prototype.constructor = ServerlessClient;
    ServerlessClient.prototype._sleep = (delay) => new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, delay);
    });
    ServerlessClient.prototype._setMaxConnections = async (__self) => {
      if (Date.now() - __self._maxConns.cache.updated > __self._maxConns.freqMs) {
        const results = await __self._plugin.showMaxConnections(__self);
        const maxConnections = results.rows[0].max_connections;
        __self._logger("Getting max connections from database...", maxConnections);
        __self._maxConns.cache = {
          total: maxConnections,
          updated: Date.now()
        };
      }
    };
    ServerlessClient.prototype._getIdleProcessesListOrderByDate = async function() {
      try {
        const result = await this._plugin.getIdleProcessesListOrderByDate(this);
        return result.rows;
      } catch (e) {
        this._logger("Swallowed internal error", e.message);
        return [];
      }
    };
    ServerlessClient.prototype._getIdleProcessesListByMinimumTimeout = async function() {
      try {
        const result = await this._plugin.getIdleProcessesListByMinimumTimeout(this);
        return result.rows;
      } catch (e) {
        this._logger("Swallowed internal error", e.message);
        return [];
      }
    };
    ServerlessClient.prototype._getProcessesCount = async function() {
      function isCacheExpiredOrDisabled(__self) {
        if (!__self._processCount.cacheEnabled) {
          return true;
        }
        return Date.now() - __self._processCount.cache.updated > __self._processCount.freqMs;
      }
      if (isCacheExpiredOrDisabled(this)) {
        try {
          const result = await this._plugin.processCount(this);
          this._processCount.cache = {
            count: result.rows[0].count || 0,
            updated: Date.now()
          };
          return result.rows[0].count;
        } catch (e) {
          this._logger("Swallowed internal error", e.message);
          return 0;
        }
      }
      return this._processCount.cache.count;
    };
    ServerlessClient.prototype._killProcesses = async function(processesList) {
      const pids = processesList.map((proc) => proc.pid);
      try {
        return await this._plugin.killProcesses(this, pids);
      } catch (e) {
        this._logger("Swallowed internal error: ", e.message);
        return {
          rows: []
        };
      }
    };
    ServerlessClient.prototype._getStrategy = function() {
      switch (this._strategy.name) {
        case "minimum_idle_time":
          return this._getIdleProcessesListByMinimumTimeout.bind(this);
        case "ranked":
          return this._getIdleProcessesListOrderByDate.bind(this);
        default:
          return this._getIdleProcessesListByMinimumTimeout.bind(this);
      }
    };
    ServerlessClient.prototype._decorrelatedJitter = function(delay) {
      const cap = this._backoff.capMs;
      const base = this._backoff.baseMs;
      const randRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
      return Math.min(cap, randRange(base, delay * 3));
    };
    ServerlessClient.prototype.clean = async function() {
      const processCount = await this._getProcessesCount();
      this._logger("Current process count: ", processCount);
      if (processCount > this._maxConns.cache.total * this._strategy.connUtilization) {
        const strategy = this._getStrategy();
        const processesList = await strategy();
        if (processesList.length) {
          const killedProcesses = await this._killProcesses(processesList);
          this._processCount.cache.count = this._processCount.cache.count - killedProcesses.rows.length;
          this._logger("+++++ Killed processes: ", killedProcesses.rows.length, " +++++");
          return killedProcesses.rows;
        }
      }
    };
    ServerlessClient.prototype._diffCredentials = function(config) {
      const keys = ["password", "host", "port", "user", "database"];
      for (const key of keys) {
        if (this._config[key] !== config[key]) {
          this._multipleCredentials.areCredentialsDifferent = true;
          break;
        }
      }
    };
    ServerlessClient.prototype._init = async function() {
      if (this._client !== null && !this._multipleCredentials.areCredentialsDifferent) {
        return;
      }
      if (this._client !== null && this._multipleCredentials.areCredentialsDifferent) {
        this._client.end();
      }
      this._client = new this._library.Client(this._config);
      this._multipleCredentials.areCredentialsDifferent = false;
      this._client.on("error", (err) => {
        if (err.message === "terminating connection due to administrator command" || err.message === "Connection terminated unexpectedly") {
          this._logger("Swallowed error: ", err.message);
        } else if (err.message === "sorry, too many clients already") {
          throw err;
        } else {
          throw err;
        }
      });
      await this._client.connect();
      this._logger("Connected...");
      if (this._maxConns.manualMaxConnections) {
        await this._setMaxConnections(this);
      }
      this._logger("Max connections: ", this._maxConns.cache.total);
    };
    ServerlessClient.prototype._validateConfig = function(config) {
      const {
        manualMaxConnections,
        maxConnsFreqMs,
        maxConnections,
        strategy,
        debug,
        maxIdleConnectionsToKill,
        minConnectionIdleTimeSec,
        connUtilization,
        capMs,
        baseMs,
        delayMs,
        maxRetries,
        library
      } = config;
      if (manualMaxConnections && type(manualMaxConnections) !== "Boolean") {
        throw new Error("manualMaxConnections must be of type Boolean");
      }
      if (debug && type(debug) !== "Boolean") {
        throw new Error("debug must be of type Boolean");
      }
      if (validateNum(maxConnsFreqMs)) {
        throw new Error("maxConnsFreqMs must be of type Number");
      }
      if (validateNum(maxConnections)) {
        throw new Error("maxConnections must be of type Number");
      }
      if (strategy && !isValidStrategy(strategy)) {
        throw new Error("the provided strategy is invalid");
      }
      if (validateNum(maxIdleConnectionsToKill)) {
        throw new Error("maxIdleConnectionsToKill must be of type Number or null");
      }
      if (validateNum(minConnectionIdleTimeSec)) {
        throw new Error("minConnectionIdleTimeSec must be of type Number");
      }
      if (validateNum(connUtilization) || !isWithinRange(connUtilization, 0, 1)) {
        throw new Error("connUtilization must be of type Number");
      }
      if (validateNum(capMs)) {
        throw new Error("capMs must be of type Number");
      }
      if (validateNum(baseMs)) {
        throw new Error("baseMs must be of type Number");
      }
      if (validateNum(delayMs)) {
        throw new Error("delayMs must be of type Number");
      }
      if (validateNum(maxRetries)) {
        throw new Error("maxRetries must be of type Number");
      }
    };
    ServerlessClient.prototype.setConfig = function(config) {
      const prevConfig = this._config;
      this._validateConfig(config);
      this._config = { ...this._config, ...config };
      this._multipleCredentials = {
        allowCredentialsDiffing: this._config.allowCredentialsDiffing || false,
        areCredentialsDifferent: false
      };
      this._maxConns = {
        // Cache expiration for getting the max connections value in milliseconds
        freqMs: this._config.maxConnsFreqMs || 6e4,
        // If this parameters is set to true it will query to get the maxConnections values,
        // to maximize performance you should set the maxConnections yourself.
        // Is suggested to manually set the maxConnections and keep this setting to false.
        manualMaxConnections: this._config.manualMaxConnections,
        cache: {
          total: this._config.maxConnections || 100,
          updated: 0
        }
      };
      this._processCount = {
        // Cache expiration for getting the process count value value in milliseconds
        freqMs: this._config.processCountFreqMs || 6e3,
        cacheEnabled: this._config.processCountCacheEnabled,
        cache: {
          count: 0,
          updated: 0
        }
      };
      this._strategy = {
        name: this._config.strategy || "minimum_idle_time",
        // The minimum number of seconds that a connection must be idle before the module will recycle it.
        minConnIdleTimeSec: this._config.minConnectionIdleTimeSec || 0.5,
        // The bigger, the more idle connections will be killed
        // this parameters control how aggressive is going to be your strategy
        // default is null which will means LIMIT ALL
        maxIdleConnectionsToKill: this._config.maxIdleConnectionsToKill || null,
        // The percentage of total connections to use when connecting to your Postgres server.
        // A value of 0.75 would use 75% of your total available connections.
        // Past this threshold the connection killer will kick in.
        connUtilization: this._config.connUtilization || 0.8
      };
      this._debug = this._config.debug;
      this._backoff = {
        capMs: this._config.capMs || 1e3,
        baseMs: this._config.baseMs || 2,
        delayMs: this._config.delayMs || 1e3,
        maxRetries: this._config.maxRetries || 3,
        retries: 0,
        queryRetries: 0
      };
      this._application_name = this._config.application_name || "serverless_client";
      this._config.application_name = this._application_name;
      if (this._multipleCredentials.allowCredentialsDiffing && this._client !== null) {
        this._diffCredentials(prevConfig, config);
      }
      this._library = this._config.library || require_lib2();
    };
    ServerlessClient.prototype._logger = function(...args) {
      if (this._debug) {
        const pid = this._client && this._client.processID || "offline";
        console.log("serverless-pg | pid: ", pid, " | ", ...args);
      }
    };
    ServerlessClient.prototype.connect = async function() {
      try {
        await this._init();
      } catch (e) {
        if (e.message === "sorry, too many clients already" || e.message === "Connection terminated unexpectedly" || e.message === "terminating connection due to administrator command" || e.message === "timeout expired") {
          this._client = null;
          if (this._backoff.retries < this._backoff.maxRetries) {
            this._logger("trying to reconnect...attempt: ", this._backoff.retries);
            const totalDelay = this._decorrelatedJitter(this._backoff.delayMs);
            this._logger("total delay: ", totalDelay);
            await this._sleep(totalDelay);
            this._backoff.retries++;
            await this.connect();
            this._backoff.retries = 0;
          } else {
            throw e;
          }
        } else {
          throw e;
        }
      }
    };
    ServerlessClient.prototype.query = async function(...args) {
      try {
        this._logger("Start query...");
        return await this._client.query(...args);
      } catch (e) {
        if (e.message === "Client has encountered a connection error and is not queryable" || e.message === "terminating connection due to administrator command" || e.message === "Connection terminated unexpectedly") {
          this._client = null;
          if (this._backoff.queryRetries < this._backoff.maxRetries) {
            this._logger("Retry query...attempt: ", this._backoff.queryRetries);
            const totalDelay = this._decorrelatedJitter(this._backoff.delayMs);
            this._logger("total delay: ", totalDelay);
            await this._sleep(totalDelay);
            this._backoff.queryRetries++;
            await this.connect();
            const result = await this.query(...args);
            this._backoff.queryRetries = 0;
            return result;
          } else {
            throw e;
          }
        }
        throw e;
      }
    };
    ServerlessClient.prototype.end = async function() {
      this._backoff.retries = 0;
      this._backoff.queryRetries = 0;
      await this._client.end();
      this._client = null;
    };
    ServerlessClient.prototype.on = function(...args) {
      this._client.on(...args);
    };
    module2.exports = { ServerlessClient };
  }
});

// node_modules/serverless-postgres/index.js
var require_serverless_postgres = __commonJS({
  "node_modules/serverless-postgres/index.js"(exports, module2) {
    var ServerlessClient = require_src().ServerlessClient;
    module2.exports = ServerlessClient;
  }
});

// node_modules/@redis/client/dist/lib/commands/APPEND.js
var require_APPEND = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/APPEND.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, value) {
      return ["APPEND", key, value];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/BITCOUNT.js
var require_BITCOUNT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/BITCOUNT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, range) {
      const args = ["BITCOUNT", key];
      if (range) {
        args.push(range.start.toString(), range.end.toString());
        if (range.mode) {
          args.push(range.mode);
        }
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/BITFIELD_RO.js
var require_BITFIELD_RO = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/BITFIELD_RO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, operations) {
      const args = ["BITFIELD_RO", key];
      for (const operation of operations) {
        args.push("GET", operation.encoding, operation.offset.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/BITFIELD.js
var require_BITFIELD = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/BITFIELD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, operations) {
      const args = ["BITFIELD", key];
      for (const options of operations) {
        switch (options.operation) {
          case "GET":
            args.push("GET", options.encoding, options.offset.toString());
            break;
          case "SET":
            args.push("SET", options.encoding, options.offset.toString(), options.value.toString());
            break;
          case "INCRBY":
            args.push("INCRBY", options.encoding, options.offset.toString(), options.increment.toString());
            break;
          case "OVERFLOW":
            args.push("OVERFLOW", options.behavior);
            break;
        }
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/generic-transformers.js
var require_generic_transformers = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/generic-transformers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformRangeReply = exports.pushSlotRangesArguments = exports.pushSortArguments = exports.transformFunctionListItemReply = exports.RedisFunctionFlags = exports.transformCommandReply = exports.CommandCategories = exports.CommandFlags = exports.pushOptionalVerdictArgument = exports.pushVerdictArgument = exports.pushVerdictNumberArguments = exports.pushVerdictArguments = exports.pushEvalArguments = exports.evalFirstKeyIndex = exports.transformPXAT = exports.transformEXAT = exports.transformGeoMembersWithReply = exports.GeoReplyWith = exports.pushGeoRadiusStoreArguments = exports.pushGeoRadiusArguments = exports.pushGeoSearchArguments = exports.pushGeoCountArgument = exports.transformLMPopArguments = exports.transformZMPopArguments = exports.transformSortedSetWithScoresReply = exports.transformSortedSetMemberReply = exports.transformSortedSetMemberNullReply = exports.transformStreamsMessagesReply = exports.transformStreamMessagesNullReply = exports.transformStreamMessagesReply = exports.transformStreamMessageNullReply = exports.transformStreamMessageReply = exports.transformTuplesReply = exports.transformStringNumberInfinityArgument = exports.transformNumberInfinityArgument = exports.transformNumberInfinityNullArrayReply = exports.transformNumberInfinityNullReply = exports.transformNumberInfinityReply = exports.pushScanArguments = exports.transformBooleanArrayReply = exports.transformBooleanReply = void 0;
    function transformBooleanReply(reply) {
      return reply === 1;
    }
    exports.transformBooleanReply = transformBooleanReply;
    function transformBooleanArrayReply(reply) {
      return reply.map(transformBooleanReply);
    }
    exports.transformBooleanArrayReply = transformBooleanArrayReply;
    function pushScanArguments(args, cursor, options) {
      args.push(cursor.toString());
      if (options?.MATCH) {
        args.push("MATCH", options.MATCH);
      }
      if (options?.COUNT) {
        args.push("COUNT", options.COUNT.toString());
      }
      return args;
    }
    exports.pushScanArguments = pushScanArguments;
    function transformNumberInfinityReply(reply) {
      switch (reply.toString()) {
        case "+inf":
          return Infinity;
        case "-inf":
          return -Infinity;
        default:
          return Number(reply);
      }
    }
    exports.transformNumberInfinityReply = transformNumberInfinityReply;
    function transformNumberInfinityNullReply(reply) {
      if (reply === null)
        return null;
      return transformNumberInfinityReply(reply);
    }
    exports.transformNumberInfinityNullReply = transformNumberInfinityNullReply;
    function transformNumberInfinityNullArrayReply(reply) {
      return reply.map(transformNumberInfinityNullReply);
    }
    exports.transformNumberInfinityNullArrayReply = transformNumberInfinityNullArrayReply;
    function transformNumberInfinityArgument(num) {
      switch (num) {
        case Infinity:
          return "+inf";
        case -Infinity:
          return "-inf";
        default:
          return num.toString();
      }
    }
    exports.transformNumberInfinityArgument = transformNumberInfinityArgument;
    function transformStringNumberInfinityArgument(num) {
      if (typeof num !== "number")
        return num;
      return transformNumberInfinityArgument(num);
    }
    exports.transformStringNumberInfinityArgument = transformStringNumberInfinityArgument;
    function transformTuplesReply(reply) {
      const message = /* @__PURE__ */ Object.create(null);
      for (let i = 0; i < reply.length; i += 2) {
        message[reply[i].toString()] = reply[i + 1];
      }
      return message;
    }
    exports.transformTuplesReply = transformTuplesReply;
    function transformStreamMessageReply([id, message]) {
      return {
        id,
        message: transformTuplesReply(message)
      };
    }
    exports.transformStreamMessageReply = transformStreamMessageReply;
    function transformStreamMessageNullReply(reply) {
      if (reply === null)
        return null;
      return transformStreamMessageReply(reply);
    }
    exports.transformStreamMessageNullReply = transformStreamMessageNullReply;
    function transformStreamMessagesReply(reply) {
      return reply.map(transformStreamMessageReply);
    }
    exports.transformStreamMessagesReply = transformStreamMessagesReply;
    function transformStreamMessagesNullReply(reply) {
      return reply.map(transformStreamMessageNullReply);
    }
    exports.transformStreamMessagesNullReply = transformStreamMessagesNullReply;
    function transformStreamsMessagesReply(reply) {
      if (reply === null)
        return null;
      return reply.map(([name, rawMessages]) => ({
        name,
        messages: transformStreamMessagesReply(rawMessages)
      }));
    }
    exports.transformStreamsMessagesReply = transformStreamsMessagesReply;
    function transformSortedSetMemberNullReply(reply) {
      if (!reply.length)
        return null;
      return transformSortedSetMemberReply(reply);
    }
    exports.transformSortedSetMemberNullReply = transformSortedSetMemberNullReply;
    function transformSortedSetMemberReply(reply) {
      return {
        value: reply[0],
        score: transformNumberInfinityReply(reply[1])
      };
    }
    exports.transformSortedSetMemberReply = transformSortedSetMemberReply;
    function transformSortedSetWithScoresReply(reply) {
      const members = [];
      for (let i = 0; i < reply.length; i += 2) {
        members.push({
          value: reply[i],
          score: transformNumberInfinityReply(reply[i + 1])
        });
      }
      return members;
    }
    exports.transformSortedSetWithScoresReply = transformSortedSetWithScoresReply;
    function transformZMPopArguments(args, keys, side, options) {
      pushVerdictArgument(args, keys);
      args.push(side);
      if (options?.COUNT) {
        args.push("COUNT", options.COUNT.toString());
      }
      return args;
    }
    exports.transformZMPopArguments = transformZMPopArguments;
    function transformLMPopArguments(args, keys, side, options) {
      pushVerdictArgument(args, keys);
      args.push(side);
      if (options?.COUNT) {
        args.push("COUNT", options.COUNT.toString());
      }
      return args;
    }
    exports.transformLMPopArguments = transformLMPopArguments;
    function pushGeoCountArgument(args, count) {
      if (typeof count === "number") {
        args.push("COUNT", count.toString());
      } else if (count) {
        args.push("COUNT", count.value.toString());
        if (count.ANY) {
          args.push("ANY");
        }
      }
      return args;
    }
    exports.pushGeoCountArgument = pushGeoCountArgument;
    function pushGeoSearchArguments(args, key, from, by, options) {
      args.push(key);
      if (typeof from === "string") {
        args.push("FROMMEMBER", from);
      } else {
        args.push("FROMLONLAT", from.longitude.toString(), from.latitude.toString());
      }
      if ("radius" in by) {
        args.push("BYRADIUS", by.radius.toString());
      } else {
        args.push("BYBOX", by.width.toString(), by.height.toString());
      }
      args.push(by.unit);
      if (options?.SORT) {
        args.push(options.SORT);
      }
      pushGeoCountArgument(args, options?.COUNT);
      return args;
    }
    exports.pushGeoSearchArguments = pushGeoSearchArguments;
    function pushGeoRadiusArguments(args, key, from, radius, unit, options) {
      args.push(key);
      if (typeof from === "string") {
        args.push(from);
      } else {
        args.push(from.longitude.toString(), from.latitude.toString());
      }
      args.push(radius.toString(), unit);
      if (options?.SORT) {
        args.push(options.SORT);
      }
      pushGeoCountArgument(args, options?.COUNT);
      return args;
    }
    exports.pushGeoRadiusArguments = pushGeoRadiusArguments;
    function pushGeoRadiusStoreArguments(args, key, from, radius, unit, destination, options) {
      pushGeoRadiusArguments(args, key, from, radius, unit, options);
      if (options?.STOREDIST) {
        args.push("STOREDIST", destination);
      } else {
        args.push("STORE", destination);
      }
      return args;
    }
    exports.pushGeoRadiusStoreArguments = pushGeoRadiusStoreArguments;
    var GeoReplyWith;
    (function(GeoReplyWith2) {
      GeoReplyWith2["DISTANCE"] = "WITHDIST";
      GeoReplyWith2["HASH"] = "WITHHASH";
      GeoReplyWith2["COORDINATES"] = "WITHCOORD";
    })(GeoReplyWith || (exports.GeoReplyWith = GeoReplyWith = {}));
    function transformGeoMembersWithReply(reply, replyWith) {
      const replyWithSet = new Set(replyWith);
      let index = 0;
      const distanceIndex = replyWithSet.has(GeoReplyWith.DISTANCE) && ++index, hashIndex = replyWithSet.has(GeoReplyWith.HASH) && ++index, coordinatesIndex = replyWithSet.has(GeoReplyWith.COORDINATES) && ++index;
      return reply.map((member) => {
        const transformedMember = {
          member: member[0]
        };
        if (distanceIndex) {
          transformedMember.distance = member[distanceIndex];
        }
        if (hashIndex) {
          transformedMember.hash = member[hashIndex];
        }
        if (coordinatesIndex) {
          const [longitude, latitude] = member[coordinatesIndex];
          transformedMember.coordinates = {
            longitude,
            latitude
          };
        }
        return transformedMember;
      });
    }
    exports.transformGeoMembersWithReply = transformGeoMembersWithReply;
    function transformEXAT(EXAT) {
      return (typeof EXAT === "number" ? EXAT : Math.floor(EXAT.getTime() / 1e3)).toString();
    }
    exports.transformEXAT = transformEXAT;
    function transformPXAT(PXAT) {
      return (typeof PXAT === "number" ? PXAT : PXAT.getTime()).toString();
    }
    exports.transformPXAT = transformPXAT;
    function evalFirstKeyIndex(options) {
      return options?.keys?.[0];
    }
    exports.evalFirstKeyIndex = evalFirstKeyIndex;
    function pushEvalArguments(args, options) {
      if (options?.keys) {
        args.push(options.keys.length.toString(), ...options.keys);
      } else {
        args.push("0");
      }
      if (options?.arguments) {
        args.push(...options.arguments);
      }
      return args;
    }
    exports.pushEvalArguments = pushEvalArguments;
    function pushVerdictArguments(args, value) {
      if (Array.isArray(value)) {
        args = args.concat(value);
      } else {
        args.push(value);
      }
      return args;
    }
    exports.pushVerdictArguments = pushVerdictArguments;
    function pushVerdictNumberArguments(args, value) {
      if (Array.isArray(value)) {
        for (const item of value) {
          args.push(item.toString());
        }
      } else {
        args.push(value.toString());
      }
      return args;
    }
    exports.pushVerdictNumberArguments = pushVerdictNumberArguments;
    function pushVerdictArgument(args, value) {
      if (Array.isArray(value)) {
        args.push(value.length.toString(), ...value);
      } else {
        args.push("1", value);
      }
      return args;
    }
    exports.pushVerdictArgument = pushVerdictArgument;
    function pushOptionalVerdictArgument(args, name, value) {
      if (value === void 0)
        return args;
      args.push(name);
      return pushVerdictArgument(args, value);
    }
    exports.pushOptionalVerdictArgument = pushOptionalVerdictArgument;
    var CommandFlags;
    (function(CommandFlags2) {
      CommandFlags2["WRITE"] = "write";
      CommandFlags2["READONLY"] = "readonly";
      CommandFlags2["DENYOOM"] = "denyoom";
      CommandFlags2["ADMIN"] = "admin";
      CommandFlags2["PUBSUB"] = "pubsub";
      CommandFlags2["NOSCRIPT"] = "noscript";
      CommandFlags2["RANDOM"] = "random";
      CommandFlags2["SORT_FOR_SCRIPT"] = "sort_for_script";
      CommandFlags2["LOADING"] = "loading";
      CommandFlags2["STALE"] = "stale";
      CommandFlags2["SKIP_MONITOR"] = "skip_monitor";
      CommandFlags2["ASKING"] = "asking";
      CommandFlags2["FAST"] = "fast";
      CommandFlags2["MOVABLEKEYS"] = "movablekeys";
    })(CommandFlags || (exports.CommandFlags = CommandFlags = {}));
    var CommandCategories;
    (function(CommandCategories2) {
      CommandCategories2["KEYSPACE"] = "@keyspace";
      CommandCategories2["READ"] = "@read";
      CommandCategories2["WRITE"] = "@write";
      CommandCategories2["SET"] = "@set";
      CommandCategories2["SORTEDSET"] = "@sortedset";
      CommandCategories2["LIST"] = "@list";
      CommandCategories2["HASH"] = "@hash";
      CommandCategories2["STRING"] = "@string";
      CommandCategories2["BITMAP"] = "@bitmap";
      CommandCategories2["HYPERLOGLOG"] = "@hyperloglog";
      CommandCategories2["GEO"] = "@geo";
      CommandCategories2["STREAM"] = "@stream";
      CommandCategories2["PUBSUB"] = "@pubsub";
      CommandCategories2["ADMIN"] = "@admin";
      CommandCategories2["FAST"] = "@fast";
      CommandCategories2["SLOW"] = "@slow";
      CommandCategories2["BLOCKING"] = "@blocking";
      CommandCategories2["DANGEROUS"] = "@dangerous";
      CommandCategories2["CONNECTION"] = "@connection";
      CommandCategories2["TRANSACTION"] = "@transaction";
      CommandCategories2["SCRIPTING"] = "@scripting";
    })(CommandCategories || (exports.CommandCategories = CommandCategories = {}));
    function transformCommandReply([name, arity, flags, firstKeyIndex, lastKeyIndex, step, categories]) {
      return {
        name,
        arity,
        flags: new Set(flags),
        firstKeyIndex,
        lastKeyIndex,
        step,
        categories: new Set(categories)
      };
    }
    exports.transformCommandReply = transformCommandReply;
    var RedisFunctionFlags;
    (function(RedisFunctionFlags2) {
      RedisFunctionFlags2["NO_WRITES"] = "no-writes";
      RedisFunctionFlags2["ALLOW_OOM"] = "allow-oom";
      RedisFunctionFlags2["ALLOW_STALE"] = "allow-stale";
      RedisFunctionFlags2["NO_CLUSTER"] = "no-cluster";
    })(RedisFunctionFlags || (exports.RedisFunctionFlags = RedisFunctionFlags = {}));
    function transformFunctionListItemReply(reply) {
      return {
        libraryName: reply[1],
        engine: reply[3],
        functions: reply[5].map((fn) => ({
          name: fn[1],
          description: fn[3],
          flags: fn[5]
        }))
      };
    }
    exports.transformFunctionListItemReply = transformFunctionListItemReply;
    function pushSortArguments(args, options) {
      if (options?.BY) {
        args.push("BY", options.BY);
      }
      if (options?.LIMIT) {
        args.push("LIMIT", options.LIMIT.offset.toString(), options.LIMIT.count.toString());
      }
      if (options?.GET) {
        for (const pattern of typeof options.GET === "string" ? [options.GET] : options.GET) {
          args.push("GET", pattern);
        }
      }
      if (options?.DIRECTION) {
        args.push(options.DIRECTION);
      }
      if (options?.ALPHA) {
        args.push("ALPHA");
      }
      return args;
    }
    exports.pushSortArguments = pushSortArguments;
    function pushSlotRangeArguments(args, range) {
      args.push(range.start.toString(), range.end.toString());
    }
    function pushSlotRangesArguments(args, ranges) {
      if (Array.isArray(ranges)) {
        for (const range of ranges) {
          pushSlotRangeArguments(args, range);
        }
      } else {
        pushSlotRangeArguments(args, ranges);
      }
      return args;
    }
    exports.pushSlotRangesArguments = pushSlotRangesArguments;
    function transformRangeReply([start, end]) {
      return {
        start,
        end
      };
    }
    exports.transformRangeReply = transformRangeReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/BITOP.js
var require_BITOP = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/BITOP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 2;
    function transformArguments(operation, destKey, key) {
      return (0, generic_transformers_1.pushVerdictArguments)(["BITOP", operation, destKey], key);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/BITPOS.js
var require_BITPOS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/BITPOS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, bit, start, end, mode) {
      const args = ["BITPOS", key, bit.toString()];
      if (typeof start === "number") {
        args.push(start.toString());
      }
      if (typeof end === "number") {
        args.push(end.toString());
      }
      if (mode) {
        args.push(mode);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/BLMOVE.js
var require_BLMOVE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/BLMOVE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(source, destination, sourceDirection, destinationDirection, timeout) {
      return [
        "BLMOVE",
        source,
        destination,
        sourceDirection,
        destinationDirection,
        timeout.toString()
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LMPOP.js
var require_LMPOP = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LMPOP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 2;
    function transformArguments(keys, side, options) {
      return (0, generic_transformers_1.transformLMPopArguments)(["LMPOP"], keys, side, options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/BLMPOP.js
var require_BLMPOP = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/BLMPOP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 3;
    function transformArguments(timeout, keys, side, options) {
      return (0, generic_transformers_1.transformLMPopArguments)(["BLMPOP", timeout.toString()], keys, side, options);
    }
    exports.transformArguments = transformArguments;
    var LMPOP_1 = require_LMPOP();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return LMPOP_1.transformReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/BLPOP.js
var require_BLPOP = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/BLPOP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(keys, timeout) {
      const args = (0, generic_transformers_1.pushVerdictArguments)(["BLPOP"], keys);
      args.push(timeout.toString());
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      if (reply === null)
        return null;
      return {
        key: reply[0],
        element: reply[1]
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/BRPOP.js
var require_BRPOP = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/BRPOP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, timeout) {
      const args = (0, generic_transformers_1.pushVerdictArguments)(["BRPOP"], key);
      args.push(timeout.toString());
      return args;
    }
    exports.transformArguments = transformArguments;
    var BLPOP_1 = require_BLPOP();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return BLPOP_1.transformReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/BRPOPLPUSH.js
var require_BRPOPLPUSH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/BRPOPLPUSH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(source, destination, timeout) {
      return ["BRPOPLPUSH", source, destination, timeout.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZMPOP.js
var require_ZMPOP = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZMPOP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 2;
    function transformArguments(keys, side, options) {
      return (0, generic_transformers_1.transformZMPopArguments)(["ZMPOP"], keys, side, options);
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return reply === null ? null : {
        key: reply[0],
        elements: reply[1].map(generic_transformers_1.transformSortedSetMemberReply)
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/BZMPOP.js
var require_BZMPOP = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/BZMPOP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 3;
    function transformArguments(timeout, keys, side, options) {
      return (0, generic_transformers_1.transformZMPopArguments)(["BZMPOP", timeout.toString()], keys, side, options);
    }
    exports.transformArguments = transformArguments;
    var ZMPOP_1 = require_ZMPOP();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return ZMPOP_1.transformReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/BZPOPMAX.js
var require_BZPOPMAX = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/BZPOPMAX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, timeout) {
      const args = (0, generic_transformers_1.pushVerdictArguments)(["BZPOPMAX"], key);
      args.push(timeout.toString());
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      if (!reply)
        return null;
      return {
        key: reply[0],
        value: reply[1],
        score: (0, generic_transformers_1.transformNumberInfinityReply)(reply[2])
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/BZPOPMIN.js
var require_BZPOPMIN = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/BZPOPMIN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, timeout) {
      const args = (0, generic_transformers_1.pushVerdictArguments)(["BZPOPMIN"], key);
      args.push(timeout.toString());
      return args;
    }
    exports.transformArguments = transformArguments;
    var BZPOPMAX_1 = require_BZPOPMAX();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return BZPOPMAX_1.transformReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/COPY.js
var require_COPY = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/COPY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(source, destination, options) {
      const args = ["COPY", source, destination];
      if (options?.destinationDb) {
        args.push("DB", options.destinationDb.toString());
      }
      if (options?.replace) {
        args.push("REPLACE");
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/DECR.js
var require_DECR = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/DECR.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return ["DECR", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/DECRBY.js
var require_DECRBY = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/DECRBY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, decrement) {
      return ["DECRBY", key, decrement.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/DEL.js
var require_DEL = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/DEL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(keys) {
      return (0, generic_transformers_1.pushVerdictArguments)(["DEL"], keys);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/DUMP.js
var require_DUMP = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/DUMP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return ["DUMP", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/EVAL_RO.js
var require_EVAL_RO = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/EVAL_RO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = generic_transformers_1.evalFirstKeyIndex;
    exports.IS_READ_ONLY = true;
    function transformArguments(script, options) {
      return (0, generic_transformers_1.pushEvalArguments)(["EVAL_RO", script], options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/EVAL.js
var require_EVAL = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/EVAL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = generic_transformers_1.evalFirstKeyIndex;
    function transformArguments(script, options) {
      return (0, generic_transformers_1.pushEvalArguments)(["EVAL", script], options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/EVALSHA_RO.js
var require_EVALSHA_RO = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/EVALSHA_RO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = generic_transformers_1.evalFirstKeyIndex;
    exports.IS_READ_ONLY = true;
    function transformArguments(sha1, options) {
      return (0, generic_transformers_1.pushEvalArguments)(["EVALSHA_RO", sha1], options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/EVALSHA.js
var require_EVALSHA = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/EVALSHA.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = generic_transformers_1.evalFirstKeyIndex;
    function transformArguments(sha1, options) {
      return (0, generic_transformers_1.pushEvalArguments)(["EVALSHA", sha1], options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/EXISTS.js
var require_EXISTS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/EXISTS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(keys) {
      return (0, generic_transformers_1.pushVerdictArguments)(["EXISTS"], keys);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/EXPIRE.js
var require_EXPIRE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/EXPIRE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, seconds, mode) {
      const args = ["EXPIRE", key, seconds.toString()];
      if (mode) {
        args.push(mode);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/EXPIREAT.js
var require_EXPIREAT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/EXPIREAT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, timestamp, mode) {
      const args = [
        "EXPIREAT",
        key,
        (0, generic_transformers_1.transformEXAT)(timestamp)
      ];
      if (mode) {
        args.push(mode);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_2 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_2.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/EXPIRETIME.js
var require_EXPIRETIME = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/EXPIRETIME.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return ["EXPIRETIME", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/FCALL_RO.js
var require_FCALL_RO = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/FCALL_RO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = generic_transformers_1.evalFirstKeyIndex;
    exports.IS_READ_ONLY = true;
    function transformArguments(fn, options) {
      return (0, generic_transformers_1.pushEvalArguments)(["FCALL_RO", fn], options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/FCALL.js
var require_FCALL = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/FCALL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = generic_transformers_1.evalFirstKeyIndex;
    function transformArguments(fn, options) {
      return (0, generic_transformers_1.pushEvalArguments)(["FCALL", fn], options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/GEOADD.js
var require_GEOADD = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GEOADD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, toAdd, options) {
      const args = ["GEOADD", key];
      if (options?.NX) {
        args.push("NX");
      } else if (options?.XX) {
        args.push("XX");
      }
      if (options?.CH) {
        args.push("CH");
      }
      for (const { longitude, latitude, member } of Array.isArray(toAdd) ? toAdd : [toAdd]) {
        args.push(longitude.toString(), latitude.toString(), member);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/GEODIST.js
var require_GEODIST = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GEODIST.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, member1, member2, unit) {
      const args = ["GEODIST", key, member1, member2];
      if (unit) {
        args.push(unit);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return reply === null ? null : Number(reply);
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/GEOHASH.js
var require_GEOHASH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GEOHASH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, member) {
      return (0, generic_transformers_1.pushVerdictArguments)(["GEOHASH", key], member);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/GEOPOS.js
var require_GEOPOS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GEOPOS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, member) {
      return (0, generic_transformers_1.pushVerdictArguments)(["GEOPOS", key], member);
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return reply.map((coordinates) => coordinates === null ? null : {
        longitude: coordinates[0],
        latitude: coordinates[1]
      });
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/GEORADIUS_RO.js
var require_GEORADIUS_RO = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GEORADIUS_RO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, coordinates, radius, unit, options) {
      return (0, generic_transformers_1.pushGeoRadiusArguments)(["GEORADIUS_RO"], key, coordinates, radius, unit, options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/GEORADIUS_RO_WITH.js
var require_GEORADIUS_RO_WITH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GEORADIUS_RO_WITH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var GEORADIUS_RO_1 = require_GEORADIUS_RO();
    var GEORADIUS_RO_2 = require_GEORADIUS_RO();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return GEORADIUS_RO_2.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return GEORADIUS_RO_2.IS_READ_ONLY;
    } });
    function transformArguments(key, coordinates, radius, unit, replyWith, options) {
      const args = (0, GEORADIUS_RO_1.transformArguments)(key, coordinates, radius, unit, options);
      args.push(...replyWith);
      args.preserve = replyWith;
      return args;
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformGeoMembersWithReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/GEORADIUS.js
var require_GEORADIUS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GEORADIUS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, coordinates, radius, unit, options) {
      return (0, generic_transformers_1.pushGeoRadiusArguments)(["GEORADIUS"], key, coordinates, radius, unit, options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/GEORADIUS_WITH.js
var require_GEORADIUS_WITH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GEORADIUS_WITH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var GEORADIUS_1 = require_GEORADIUS();
    var GEORADIUS_2 = require_GEORADIUS();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return GEORADIUS_2.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return GEORADIUS_2.IS_READ_ONLY;
    } });
    function transformArguments(key, coordinates, radius, unit, replyWith, options) {
      const args = (0, GEORADIUS_1.transformArguments)(key, coordinates, radius, unit, options);
      args.push(...replyWith);
      args.preserve = replyWith;
      return args;
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformGeoMembersWithReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/GEORADIUSBYMEMBER_RO.js
var require_GEORADIUSBYMEMBER_RO = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GEORADIUSBYMEMBER_RO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, member, radius, unit, options) {
      return (0, generic_transformers_1.pushGeoRadiusArguments)(["GEORADIUSBYMEMBER_RO"], key, member, radius, unit, options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/GEORADIUSBYMEMBER_RO_WITH.js
var require_GEORADIUSBYMEMBER_RO_WITH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GEORADIUSBYMEMBER_RO_WITH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var GEORADIUSBYMEMBER_RO_1 = require_GEORADIUSBYMEMBER_RO();
    var GEORADIUSBYMEMBER_RO_2 = require_GEORADIUSBYMEMBER_RO();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return GEORADIUSBYMEMBER_RO_2.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return GEORADIUSBYMEMBER_RO_2.IS_READ_ONLY;
    } });
    function transformArguments(key, member, radius, unit, replyWith, options) {
      const args = (0, GEORADIUSBYMEMBER_RO_1.transformArguments)(key, member, radius, unit, options);
      args.push(...replyWith);
      args.preserve = replyWith;
      return args;
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformGeoMembersWithReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/GEORADIUSBYMEMBER.js
var require_GEORADIUSBYMEMBER = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GEORADIUSBYMEMBER.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, member, radius, unit, options) {
      return (0, generic_transformers_1.pushGeoRadiusArguments)(["GEORADIUSBYMEMBER"], key, member, radius, unit, options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/GEORADIUSBYMEMBER_WITH.js
var require_GEORADIUSBYMEMBER_WITH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GEORADIUSBYMEMBER_WITH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var GEORADIUSBYMEMBER_1 = require_GEORADIUSBYMEMBER();
    var GEORADIUSBYMEMBER_2 = require_GEORADIUSBYMEMBER();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return GEORADIUSBYMEMBER_2.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return GEORADIUSBYMEMBER_2.IS_READ_ONLY;
    } });
    function transformArguments(key, member, radius, unit, replyWith, options) {
      const args = (0, GEORADIUSBYMEMBER_1.transformArguments)(key, member, radius, unit, options);
      args.push(...replyWith);
      args.preserve = replyWith;
      return args;
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformGeoMembersWithReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/GEORADIUSBYMEMBERSTORE.js
var require_GEORADIUSBYMEMBERSTORE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GEORADIUSBYMEMBERSTORE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    var GEORADIUSBYMEMBER_1 = require_GEORADIUSBYMEMBER();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return GEORADIUSBYMEMBER_1.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return GEORADIUSBYMEMBER_1.IS_READ_ONLY;
    } });
    function transformArguments(key, member, radius, unit, destination, options) {
      return (0, generic_transformers_1.pushGeoRadiusStoreArguments)(["GEORADIUSBYMEMBER"], key, member, radius, unit, destination, options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/GEORADIUSSTORE.js
var require_GEORADIUSSTORE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GEORADIUSSTORE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    var GEORADIUS_1 = require_GEORADIUS();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return GEORADIUS_1.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return GEORADIUS_1.IS_READ_ONLY;
    } });
    function transformArguments(key, coordinates, radius, unit, destination, options) {
      return (0, generic_transformers_1.pushGeoRadiusStoreArguments)(["GEORADIUS"], key, coordinates, radius, unit, destination, options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/GEOSEARCH.js
var require_GEOSEARCH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GEOSEARCH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, from, by, options) {
      return (0, generic_transformers_1.pushGeoSearchArguments)(["GEOSEARCH"], key, from, by, options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/GEOSEARCH_WITH.js
var require_GEOSEARCH_WITH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GEOSEARCH_WITH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var GEOSEARCH_1 = require_GEOSEARCH();
    var GEOSEARCH_2 = require_GEOSEARCH();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return GEOSEARCH_2.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return GEOSEARCH_2.IS_READ_ONLY;
    } });
    function transformArguments(key, from, by, replyWith, options) {
      const args = (0, GEOSEARCH_1.transformArguments)(key, from, by, options);
      args.push(...replyWith);
      args.preserve = replyWith;
      return args;
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformGeoMembersWithReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/GEOSEARCHSTORE.js
var require_GEOSEARCHSTORE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GEOSEARCHSTORE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    var GEOSEARCH_1 = require_GEOSEARCH();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return GEOSEARCH_1.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return GEOSEARCH_1.IS_READ_ONLY;
    } });
    function transformArguments(destination, source, from, by, options) {
      const args = (0, generic_transformers_1.pushGeoSearchArguments)(["GEOSEARCHSTORE", destination], source, from, by, options);
      if (options?.STOREDIST) {
        args.push("STOREDIST");
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      if (typeof reply !== "number") {
        throw new TypeError(`https://github.com/redis/redis/issues/9261`);
      }
      return reply;
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/GET.js
var require_GET = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["GET", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/GETBIT.js
var require_GETBIT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GETBIT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, offset) {
      return ["GETBIT", key, offset.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/GETDEL.js
var require_GETDEL = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GETDEL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return ["GETDEL", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/GETEX.js
var require_GETEX = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GETEX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, mode) {
      const args = ["GETEX", key];
      if ("EX" in mode) {
        args.push("EX", mode.EX.toString());
      } else if ("PX" in mode) {
        args.push("PX", mode.PX.toString());
      } else if ("EXAT" in mode) {
        args.push("EXAT", (0, generic_transformers_1.transformEXAT)(mode.EXAT));
      } else if ("PXAT" in mode) {
        args.push("PXAT", (0, generic_transformers_1.transformPXAT)(mode.PXAT));
      } else {
        args.push("PERSIST");
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/GETRANGE.js
var require_GETRANGE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GETRANGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, start, end) {
      return ["GETRANGE", key, start.toString(), end.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/GETSET.js
var require_GETSET = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/GETSET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, value) {
      return ["GETSET", key, value];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/HDEL.js
var require_HDEL = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/HDEL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, field) {
      return (0, generic_transformers_1.pushVerdictArguments)(["HDEL", key], field);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/HEXISTS.js
var require_HEXISTS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/HEXISTS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, field) {
      return ["HEXISTS", key, field];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/HGET.js
var require_HGET = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/HGET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, field) {
      return ["HGET", key, field];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/HGETALL.js
var require_HGETALL = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/HGETALL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.TRANSFORM_LEGACY_REPLY = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    exports.TRANSFORM_LEGACY_REPLY = true;
    function transformArguments(key) {
      return ["HGETALL", key];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformTuplesReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/HINCRBY.js
var require_HINCRBY = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/HINCRBY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, field, increment) {
      return ["HINCRBY", key, field, increment.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/HINCRBYFLOAT.js
var require_HINCRBYFLOAT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/HINCRBYFLOAT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, field, increment) {
      return ["HINCRBYFLOAT", key, field, increment.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/HKEYS.js
var require_HKEYS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/HKEYS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return ["HKEYS", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/HLEN.js
var require_HLEN = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/HLEN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return ["HLEN", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/HMGET.js
var require_HMGET = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/HMGET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, fields) {
      return (0, generic_transformers_1.pushVerdictArguments)(["HMGET", key], fields);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/HRANDFIELD.js
var require_HRANDFIELD = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/HRANDFIELD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["HRANDFIELD", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/HRANDFIELD_COUNT.js
var require_HRANDFIELD_COUNT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/HRANDFIELD_COUNT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var HRANDFIELD_1 = require_HRANDFIELD();
    var HRANDFIELD_2 = require_HRANDFIELD();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return HRANDFIELD_2.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return HRANDFIELD_2.IS_READ_ONLY;
    } });
    function transformArguments(key, count) {
      return [
        ...(0, HRANDFIELD_1.transformArguments)(key),
        count.toString()
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/HRANDFIELD_COUNT_WITHVALUES.js
var require_HRANDFIELD_COUNT_WITHVALUES = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/HRANDFIELD_COUNT_WITHVALUES.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var HRANDFIELD_COUNT_1 = require_HRANDFIELD_COUNT();
    var HRANDFIELD_COUNT_2 = require_HRANDFIELD_COUNT();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return HRANDFIELD_COUNT_2.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return HRANDFIELD_COUNT_2.IS_READ_ONLY;
    } });
    function transformArguments(key, count) {
      return [
        ...(0, HRANDFIELD_COUNT_1.transformArguments)(key, count),
        "WITHVALUES"
      ];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformTuplesReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/HSCAN.js
var require_HSCAN = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/HSCAN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, cursor, options) {
      return (0, generic_transformers_1.pushScanArguments)([
        "HSCAN",
        key
      ], cursor, options);
    }
    exports.transformArguments = transformArguments;
    function transformReply([cursor, rawTuples]) {
      const parsedTuples = [];
      for (let i = 0; i < rawTuples.length; i += 2) {
        parsedTuples.push({
          field: rawTuples[i],
          value: rawTuples[i + 1]
        });
      }
      return {
        cursor: Number(cursor),
        tuples: parsedTuples
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/HSET.js
var require_HSET = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/HSET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(...[key, value, fieldValue]) {
      const args = ["HSET", key];
      if (typeof value === "string" || typeof value === "number" || Buffer.isBuffer(value)) {
        args.push(convertValue(value), convertValue(fieldValue));
      } else if (value instanceof Map) {
        pushMap(args, value);
      } else if (Array.isArray(value)) {
        pushTuples(args, value);
      } else {
        pushObject(args, value);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function pushMap(args, map) {
      for (const [key, value] of map.entries()) {
        args.push(convertValue(key), convertValue(value));
      }
    }
    function pushTuples(args, tuples) {
      for (const tuple of tuples) {
        if (Array.isArray(tuple)) {
          pushTuples(args, tuple);
          continue;
        }
        args.push(convertValue(tuple));
      }
    }
    function pushObject(args, object) {
      for (const key of Object.keys(object)) {
        args.push(convertValue(key), convertValue(object[key]));
      }
    }
    function convertValue(value) {
      return typeof value === "number" ? value.toString() : value;
    }
  }
});

// node_modules/@redis/client/dist/lib/commands/HSETNX.js
var require_HSETNX = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/HSETNX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, field, value) {
      return ["HSETNX", key, field, value];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/HSTRLEN.js
var require_HSTRLEN = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/HSTRLEN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, field) {
      return ["HSTRLEN", key, field];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/HVALS.js
var require_HVALS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/HVALS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return ["HVALS", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/INCR.js
var require_INCR = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/INCR.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return ["INCR", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/INCRBY.js
var require_INCRBY = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/INCRBY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, increment) {
      return ["INCRBY", key, increment.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/INCRBYFLOAT.js
var require_INCRBYFLOAT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/INCRBYFLOAT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, increment) {
      return ["INCRBYFLOAT", key, increment.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LCS.js
var require_LCS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LCS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key1, key2) {
      return [
        "LCS",
        key1,
        key2
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LCS_IDX_WITHMATCHLEN.js
var require_LCS_IDX_WITHMATCHLEN = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LCS_IDX_WITHMATCHLEN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    var LCS_1 = require_LCS();
    var LCS_2 = require_LCS();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return LCS_2.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return LCS_2.IS_READ_ONLY;
    } });
    function transformArguments(key1, key2) {
      const args = (0, LCS_1.transformArguments)(key1, key2);
      args.push("IDX", "WITHMATCHLEN");
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return {
        matches: reply[1].map(([key1, key2, length]) => ({
          key1: (0, generic_transformers_1.transformRangeReply)(key1),
          key2: (0, generic_transformers_1.transformRangeReply)(key2),
          length
        })),
        length: reply[3]
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/LCS_IDX.js
var require_LCS_IDX = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LCS_IDX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    var LCS_1 = require_LCS();
    var LCS_2 = require_LCS();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return LCS_2.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return LCS_2.IS_READ_ONLY;
    } });
    function transformArguments(key1, key2) {
      const args = (0, LCS_1.transformArguments)(key1, key2);
      args.push("IDX");
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return {
        matches: reply[1].map(([key1, key2]) => ({
          key1: (0, generic_transformers_1.transformRangeReply)(key1),
          key2: (0, generic_transformers_1.transformRangeReply)(key2)
        })),
        length: reply[3]
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/LCS_LEN.js
var require_LCS_LEN = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LCS_LEN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var LCS_1 = require_LCS();
    var LCS_2 = require_LCS();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return LCS_2.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return LCS_2.IS_READ_ONLY;
    } });
    function transformArguments(key1, key2) {
      const args = (0, LCS_1.transformArguments)(key1, key2);
      args.push("LEN");
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LINDEX.js
var require_LINDEX = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LINDEX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, index) {
      return ["LINDEX", key, index.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LINSERT.js
var require_LINSERT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LINSERT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, position, pivot, element) {
      return [
        "LINSERT",
        key,
        position,
        pivot,
        element
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LLEN.js
var require_LLEN = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LLEN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["LLEN", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LMOVE.js
var require_LMOVE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LMOVE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(source, destination, sourceSide, destinationSide) {
      return [
        "LMOVE",
        source,
        destination,
        sourceSide,
        destinationSide
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LPOP_COUNT.js
var require_LPOP_COUNT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LPOP_COUNT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, count) {
      return ["LPOP", key, count.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LPOP.js
var require_LPOP = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LPOP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return ["LPOP", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LPOS.js
var require_LPOS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LPOS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, element, options) {
      const args = ["LPOS", key, element];
      if (typeof options?.RANK === "number") {
        args.push("RANK", options.RANK.toString());
      }
      if (typeof options?.MAXLEN === "number") {
        args.push("MAXLEN", options.MAXLEN.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LPOS_COUNT.js
var require_LPOS_COUNT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LPOS_COUNT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var LPOS_1 = require_LPOS();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return LPOS_1.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return LPOS_1.IS_READ_ONLY;
    } });
    function transformArguments(key, element, count, options) {
      const args = ["LPOS", key, element];
      if (typeof options?.RANK === "number") {
        args.push("RANK", options.RANK.toString());
      }
      args.push("COUNT", count.toString());
      if (typeof options?.MAXLEN === "number") {
        args.push("MAXLEN", options.MAXLEN.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LPUSH.js
var require_LPUSH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LPUSH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, elements) {
      return (0, generic_transformers_1.pushVerdictArguments)(["LPUSH", key], elements);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LPUSHX.js
var require_LPUSHX = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LPUSHX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, element) {
      return (0, generic_transformers_1.pushVerdictArguments)(["LPUSHX", key], element);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LRANGE.js
var require_LRANGE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LRANGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, start, stop) {
      return [
        "LRANGE",
        key,
        start.toString(),
        stop.toString()
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LREM.js
var require_LREM = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LREM.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, count, element) {
      return [
        "LREM",
        key,
        count.toString(),
        element
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LSET.js
var require_LSET = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LSET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, index, element) {
      return [
        "LSET",
        key,
        index.toString(),
        element
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LTRIM.js
var require_LTRIM = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LTRIM.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, start, stop) {
      return [
        "LTRIM",
        key,
        start.toString(),
        stop.toString()
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/MGET.js
var require_MGET = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/MGET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(keys) {
      return ["MGET", ...keys];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/MIGRATE.js
var require_MIGRATE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/MIGRATE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(host, port, key, destinationDb, timeout, options) {
      const args = ["MIGRATE", host, port.toString()], isKeyArray = Array.isArray(key);
      if (isKeyArray) {
        args.push("");
      } else {
        args.push(key);
      }
      args.push(destinationDb.toString(), timeout.toString());
      if (options?.COPY) {
        args.push("COPY");
      }
      if (options?.REPLACE) {
        args.push("REPLACE");
      }
      if (options?.AUTH) {
        if (options.AUTH.username) {
          args.push("AUTH2", options.AUTH.username, options.AUTH.password);
        } else {
          args.push("AUTH", options.AUTH.password);
        }
      }
      if (isKeyArray) {
        args.push("KEYS", ...key);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/MSET.js
var require_MSET = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/MSET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(toSet) {
      const args = ["MSET"];
      if (Array.isArray(toSet)) {
        args.push(...toSet.flat());
      } else {
        for (const key of Object.keys(toSet)) {
          args.push(key, toSet[key]);
        }
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/MSETNX.js
var require_MSETNX = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/MSETNX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(toSet) {
      const args = ["MSETNX"];
      if (Array.isArray(toSet)) {
        args.push(...toSet.flat());
      } else {
        for (const key of Object.keys(toSet)) {
          args.push(key, toSet[key]);
        }
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/OBJECT_ENCODING.js
var require_OBJECT_ENCODING = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/OBJECT_ENCODING.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 2;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["OBJECT", "ENCODING", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/OBJECT_FREQ.js
var require_OBJECT_FREQ = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/OBJECT_FREQ.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 2;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["OBJECT", "FREQ", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/OBJECT_IDLETIME.js
var require_OBJECT_IDLETIME = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/OBJECT_IDLETIME.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 2;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["OBJECT", "IDLETIME", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/OBJECT_REFCOUNT.js
var require_OBJECT_REFCOUNT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/OBJECT_REFCOUNT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 2;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["OBJECT", "REFCOUNT", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/PERSIST.js
var require_PERSIST = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/PERSIST.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return ["PERSIST", key];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/PEXPIRE.js
var require_PEXPIRE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/PEXPIRE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, milliseconds, mode) {
      const args = ["PEXPIRE", key, milliseconds.toString()];
      if (mode) {
        args.push(mode);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/PEXPIREAT.js
var require_PEXPIREAT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/PEXPIREAT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, millisecondsTimestamp, mode) {
      const args = [
        "PEXPIREAT",
        key,
        (0, generic_transformers_1.transformPXAT)(millisecondsTimestamp)
      ];
      if (mode) {
        args.push(mode);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_2 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_2.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/PEXPIRETIME.js
var require_PEXPIRETIME = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/PEXPIRETIME.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return ["PEXPIRETIME", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/PFADD.js
var require_PFADD = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/PFADD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, element) {
      return (0, generic_transformers_1.pushVerdictArguments)(["PFADD", key], element);
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_2 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_2.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/PFCOUNT.js
var require_PFCOUNT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/PFCOUNT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return (0, generic_transformers_1.pushVerdictArguments)(["PFCOUNT"], key);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/PFMERGE.js
var require_PFMERGE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/PFMERGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(destination, source) {
      return (0, generic_transformers_1.pushVerdictArguments)(["PFMERGE", destination], source);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/PSETEX.js
var require_PSETEX = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/PSETEX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, milliseconds, value) {
      return [
        "PSETEX",
        key,
        milliseconds.toString(),
        value
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/PTTL.js
var require_PTTL = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/PTTL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["PTTL", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/PUBLISH.js
var require_PUBLISH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/PUBLISH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments(channel, message) {
      return ["PUBLISH", channel, message];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/RENAME.js
var require_RENAME = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/RENAME.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, newKey) {
      return ["RENAME", key, newKey];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/RENAMENX.js
var require_RENAMENX = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/RENAMENX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, newKey) {
      return ["RENAMENX", key, newKey];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/RESTORE.js
var require_RESTORE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/RESTORE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, ttl, serializedValue, options) {
      const args = ["RESTORE", key, ttl.toString(), serializedValue];
      if (options?.REPLACE) {
        args.push("REPLACE");
      }
      if (options?.ABSTTL) {
        args.push("ABSTTL");
      }
      if (options?.IDLETIME) {
        args.push("IDLETIME", options.IDLETIME.toString());
      }
      if (options?.FREQ) {
        args.push("FREQ", options.FREQ.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/RPOP_COUNT.js
var require_RPOP_COUNT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/RPOP_COUNT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, count) {
      return ["RPOP", key, count.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/RPOP.js
var require_RPOP = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/RPOP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return ["RPOP", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/RPOPLPUSH.js
var require_RPOPLPUSH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/RPOPLPUSH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(source, destination) {
      return ["RPOPLPUSH", source, destination];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/RPUSH.js
var require_RPUSH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/RPUSH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, element) {
      return (0, generic_transformers_1.pushVerdictArguments)(["RPUSH", key], element);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/RPUSHX.js
var require_RPUSHX = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/RPUSHX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, element) {
      return (0, generic_transformers_1.pushVerdictArguments)(["RPUSHX", key], element);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SADD.js
var require_SADD = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SADD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, members) {
      return (0, generic_transformers_1.pushVerdictArguments)(["SADD", key], members);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SCARD.js
var require_SCARD = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SCARD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return ["SCARD", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SDIFF.js
var require_SDIFF = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SDIFF.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(keys) {
      return (0, generic_transformers_1.pushVerdictArguments)(["SDIFF"], keys);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SDIFFSTORE.js
var require_SDIFFSTORE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SDIFFSTORE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(destination, keys) {
      return (0, generic_transformers_1.pushVerdictArguments)(["SDIFFSTORE", destination], keys);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SET.js
var require_SET = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, value, options) {
      const args = [
        "SET",
        key,
        typeof value === "number" ? value.toString() : value
      ];
      if (options?.EX !== void 0) {
        args.push("EX", options.EX.toString());
      } else if (options?.PX !== void 0) {
        args.push("PX", options.PX.toString());
      } else if (options?.EXAT !== void 0) {
        args.push("EXAT", options.EXAT.toString());
      } else if (options?.PXAT !== void 0) {
        args.push("PXAT", options.PXAT.toString());
      } else if (options?.KEEPTTL) {
        args.push("KEEPTTL");
      }
      if (options?.NX) {
        args.push("NX");
      } else if (options?.XX) {
        args.push("XX");
      }
      if (options?.GET) {
        args.push("GET");
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SETBIT.js
var require_SETBIT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SETBIT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, offset, value) {
      return ["SETBIT", key, offset.toString(), value.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SETEX.js
var require_SETEX = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SETEX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, seconds, value) {
      return [
        "SETEX",
        key,
        seconds.toString(),
        value
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SETNX.js
var require_SETNX = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SETNX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, value) {
      return ["SETNX", key, value];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/SETRANGE.js
var require_SETRANGE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SETRANGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, offset, value) {
      return ["SETRANGE", key, offset.toString(), value];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SINTER.js
var require_SINTER = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SINTER.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(keys) {
      return (0, generic_transformers_1.pushVerdictArguments)(["SINTER"], keys);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SINTERCARD.js
var require_SINTERCARD = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SINTERCARD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 2;
    exports.IS_READ_ONLY = true;
    function transformArguments(keys, limit) {
      const args = (0, generic_transformers_1.pushVerdictArgument)(["SINTERCARD"], keys);
      if (limit) {
        args.push("LIMIT", limit.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SINTERSTORE.js
var require_SINTERSTORE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SINTERSTORE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(destination, keys) {
      return (0, generic_transformers_1.pushVerdictArguments)(["SINTERSTORE", destination], keys);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SISMEMBER.js
var require_SISMEMBER = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SISMEMBER.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, member) {
      return ["SISMEMBER", key, member];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/SMEMBERS.js
var require_SMEMBERS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SMEMBERS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return ["SMEMBERS", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SMISMEMBER.js
var require_SMISMEMBER = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SMISMEMBER.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, members) {
      return ["SMISMEMBER", key, ...members];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanArrayReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/SMOVE.js
var require_SMOVE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SMOVE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(source, destination, member) {
      return ["SMOVE", source, destination, member];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/SORT_RO.js
var require_SORT_RO = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SORT_RO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, options) {
      return (0, generic_transformers_1.pushSortArguments)(["SORT_RO", key], options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SORT.js
var require_SORT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SORT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, options) {
      return (0, generic_transformers_1.pushSortArguments)(["SORT", key], options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SORT_STORE.js
var require_SORT_STORE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SORT_STORE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var SORT_1 = require_SORT();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(source, destination, options) {
      const args = (0, SORT_1.transformArguments)(source, options);
      args.push("STORE", destination);
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SPOP.js
var require_SPOP = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SPOP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, count) {
      const args = ["SPOP", key];
      if (typeof count === "number") {
        args.push(count.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SPUBLISH.js
var require_SPUBLISH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SPUBLISH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(channel, message) {
      return ["SPUBLISH", channel, message];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SRANDMEMBER.js
var require_SRANDMEMBER = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SRANDMEMBER.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return ["SRANDMEMBER", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SRANDMEMBER_COUNT.js
var require_SRANDMEMBER_COUNT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SRANDMEMBER_COUNT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var SRANDMEMBER_1 = require_SRANDMEMBER();
    var SRANDMEMBER_2 = require_SRANDMEMBER();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return SRANDMEMBER_2.FIRST_KEY_INDEX;
    } });
    function transformArguments(key, count) {
      return [
        ...(0, SRANDMEMBER_1.transformArguments)(key),
        count.toString()
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SREM.js
var require_SREM = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SREM.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, members) {
      return (0, generic_transformers_1.pushVerdictArguments)(["SREM", key], members);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SSCAN.js
var require_SSCAN = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SSCAN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, cursor, options) {
      return (0, generic_transformers_1.pushScanArguments)([
        "SSCAN",
        key
      ], cursor, options);
    }
    exports.transformArguments = transformArguments;
    function transformReply([cursor, members]) {
      return {
        cursor: Number(cursor),
        members
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/STRLEN.js
var require_STRLEN = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/STRLEN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["STRLEN", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SUNION.js
var require_SUNION = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SUNION.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(keys) {
      return (0, generic_transformers_1.pushVerdictArguments)(["SUNION"], keys);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SUNIONSTORE.js
var require_SUNIONSTORE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SUNIONSTORE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(destination, keys) {
      return (0, generic_transformers_1.pushVerdictArguments)(["SUNIONSTORE", destination], keys);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/TOUCH.js
var require_TOUCH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/TOUCH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return (0, generic_transformers_1.pushVerdictArguments)(["TOUCH"], key);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/TTL.js
var require_TTL = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/TTL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["TTL", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/TYPE.js
var require_TYPE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/TYPE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["TYPE", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/UNLINK.js
var require_UNLINK = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/UNLINK.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return (0, generic_transformers_1.pushVerdictArguments)(["UNLINK"], key);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/WATCH.js
var require_WATCH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/WATCH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return (0, generic_transformers_1.pushVerdictArguments)(["WATCH"], key);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/XACK.js
var require_XACK = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XACK.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, group, id) {
      return (0, generic_transformers_1.pushVerdictArguments)(["XACK", key, group], id);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/XADD.js
var require_XADD = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XADD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, id, message, options) {
      const args = ["XADD", key];
      if (options?.NOMKSTREAM) {
        args.push("NOMKSTREAM");
      }
      if (options?.TRIM) {
        if (options.TRIM.strategy) {
          args.push(options.TRIM.strategy);
        }
        if (options.TRIM.strategyModifier) {
          args.push(options.TRIM.strategyModifier);
        }
        args.push(options.TRIM.threshold.toString());
        if (options.TRIM.limit) {
          args.push("LIMIT", options.TRIM.limit.toString());
        }
      }
      args.push(id);
      for (const [key2, value] of Object.entries(message)) {
        args.push(key2, value);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/XAUTOCLAIM.js
var require_XAUTOCLAIM = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XAUTOCLAIM.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, group, consumer, minIdleTime, start, options) {
      const args = ["XAUTOCLAIM", key, group, consumer, minIdleTime.toString(), start];
      if (options?.COUNT) {
        args.push("COUNT", options.COUNT.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return {
        nextId: reply[0],
        messages: (0, generic_transformers_1.transformStreamMessagesNullReply)(reply[1])
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/XAUTOCLAIM_JUSTID.js
var require_XAUTOCLAIM_JUSTID = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XAUTOCLAIM_JUSTID.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var XAUTOCLAIM_1 = require_XAUTOCLAIM();
    var XAUTOCLAIM_2 = require_XAUTOCLAIM();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return XAUTOCLAIM_2.FIRST_KEY_INDEX;
    } });
    function transformArguments(...args) {
      return [
        ...(0, XAUTOCLAIM_1.transformArguments)(...args),
        "JUSTID"
      ];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return {
        nextId: reply[0],
        messages: reply[1]
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/XCLAIM.js
var require_XCLAIM = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XCLAIM.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, group, consumer, minIdleTime, id, options) {
      const args = (0, generic_transformers_1.pushVerdictArguments)(["XCLAIM", key, group, consumer, minIdleTime.toString()], id);
      if (options?.IDLE) {
        args.push("IDLE", options.IDLE.toString());
      }
      if (options?.TIME) {
        args.push("TIME", (typeof options.TIME === "number" ? options.TIME : options.TIME.getTime()).toString());
      }
      if (options?.RETRYCOUNT) {
        args.push("RETRYCOUNT", options.RETRYCOUNT.toString());
      }
      if (options?.FORCE) {
        args.push("FORCE");
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_2 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_2.transformStreamMessagesNullReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/XCLAIM_JUSTID.js
var require_XCLAIM_JUSTID = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XCLAIM_JUSTID.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var XCLAIM_1 = require_XCLAIM();
    var XCLAIM_2 = require_XCLAIM();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return XCLAIM_2.FIRST_KEY_INDEX;
    } });
    function transformArguments(...args) {
      return [
        ...(0, XCLAIM_1.transformArguments)(...args),
        "JUSTID"
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/XDEL.js
var require_XDEL = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XDEL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, id) {
      return (0, generic_transformers_1.pushVerdictArguments)(["XDEL", key], id);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/XGROUP_CREATE.js
var require_XGROUP_CREATE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XGROUP_CREATE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 2;
    function transformArguments(key, group, id, options) {
      const args = ["XGROUP", "CREATE", key, group, id];
      if (options?.MKSTREAM) {
        args.push("MKSTREAM");
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/XGROUP_CREATECONSUMER.js
var require_XGROUP_CREATECONSUMER = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XGROUP_CREATECONSUMER.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 2;
    function transformArguments(key, group, consumer) {
      return ["XGROUP", "CREATECONSUMER", key, group, consumer];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/XGROUP_DELCONSUMER.js
var require_XGROUP_DELCONSUMER = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XGROUP_DELCONSUMER.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 2;
    function transformArguments(key, group, consumer) {
      return ["XGROUP", "DELCONSUMER", key, group, consumer];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/XGROUP_DESTROY.js
var require_XGROUP_DESTROY = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XGROUP_DESTROY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 2;
    function transformArguments(key, group) {
      return ["XGROUP", "DESTROY", key, group];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/XGROUP_SETID.js
var require_XGROUP_SETID = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XGROUP_SETID.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 2;
    function transformArguments(key, group, id) {
      return ["XGROUP", "SETID", key, group, id];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/XINFO_CONSUMERS.js
var require_XINFO_CONSUMERS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XINFO_CONSUMERS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 2;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, group) {
      return ["XINFO", "CONSUMERS", key, group];
    }
    exports.transformArguments = transformArguments;
    function transformReply(rawReply) {
      return rawReply.map((consumer) => ({
        name: consumer[1],
        pending: consumer[3],
        idle: consumer[5],
        inactive: consumer[7]
      }));
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/XINFO_GROUPS.js
var require_XINFO_GROUPS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XINFO_GROUPS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 2;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["XINFO", "GROUPS", key];
    }
    exports.transformArguments = transformArguments;
    function transformReply(rawReply) {
      return rawReply.map((group) => ({
        name: group[1],
        consumers: group[3],
        pending: group[5],
        lastDeliveredId: group[7]
      }));
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/XINFO_STREAM.js
var require_XINFO_STREAM = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XINFO_STREAM.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 2;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["XINFO", "STREAM", key];
    }
    exports.transformArguments = transformArguments;
    function transformReply(rawReply) {
      const parsedReply = {};
      for (let i = 0; i < rawReply.length; i += 2) {
        switch (rawReply[i]) {
          case "length":
            parsedReply.length = rawReply[i + 1];
            break;
          case "radix-tree-keys":
            parsedReply.radixTreeKeys = rawReply[i + 1];
            break;
          case "radix-tree-nodes":
            parsedReply.radixTreeNodes = rawReply[i + 1];
            break;
          case "groups":
            parsedReply.groups = rawReply[i + 1];
            break;
          case "last-generated-id":
            parsedReply.lastGeneratedId = rawReply[i + 1];
            break;
          case "first-entry":
            parsedReply.firstEntry = rawReply[i + 1] ? {
              id: rawReply[i + 1][0],
              message: (0, generic_transformers_1.transformTuplesReply)(rawReply[i + 1][1])
            } : null;
            break;
          case "last-entry":
            parsedReply.lastEntry = rawReply[i + 1] ? {
              id: rawReply[i + 1][0],
              message: (0, generic_transformers_1.transformTuplesReply)(rawReply[i + 1][1])
            } : null;
            break;
        }
      }
      return parsedReply;
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/XLEN.js
var require_XLEN = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XLEN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["XLEN", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/XPENDING_RANGE.js
var require_XPENDING_RANGE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XPENDING_RANGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, group, start, end, count, options) {
      const args = ["XPENDING", key, group];
      if (options?.IDLE) {
        args.push("IDLE", options.IDLE.toString());
      }
      args.push(start, end, count.toString());
      if (options?.consumer) {
        args.push(options.consumer);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return reply.map(([id, owner, millisecondsSinceLastDelivery, deliveriesCounter]) => ({
        id,
        owner,
        millisecondsSinceLastDelivery,
        deliveriesCounter
      }));
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/XPENDING.js
var require_XPENDING = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XPENDING.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, group) {
      return ["XPENDING", key, group];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return {
        pending: reply[0],
        firstId: reply[1],
        lastId: reply[2],
        consumers: reply[3] === null ? null : reply[3].map(([name, deliveriesCounter]) => ({
          name,
          deliveriesCounter: Number(deliveriesCounter)
        }))
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/XRANGE.js
var require_XRANGE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XRANGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, start, end, options) {
      const args = ["XRANGE", key, start, end];
      if (options?.COUNT) {
        args.push("COUNT", options.COUNT.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformStreamMessagesReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/XREAD.js
var require_XREAD = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XREAD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var FIRST_KEY_INDEX = (streams) => {
      return Array.isArray(streams) ? streams[0].key : streams.key;
    };
    exports.FIRST_KEY_INDEX = FIRST_KEY_INDEX;
    exports.IS_READ_ONLY = true;
    function transformArguments(streams, options) {
      const args = ["XREAD"];
      if (options?.COUNT) {
        args.push("COUNT", options.COUNT.toString());
      }
      if (typeof options?.BLOCK === "number") {
        args.push("BLOCK", options.BLOCK.toString());
      }
      args.push("STREAMS");
      const streamsArray = Array.isArray(streams) ? streams : [streams], argsLength = args.length;
      for (let i = 0; i < streamsArray.length; i++) {
        const stream = streamsArray[i];
        args[argsLength + i] = stream.key;
        args[argsLength + streamsArray.length + i] = stream.id;
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformStreamsMessagesReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/XREADGROUP.js
var require_XREADGROUP = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XREADGROUP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var FIRST_KEY_INDEX = (_group, _consumer, streams) => {
      return Array.isArray(streams) ? streams[0].key : streams.key;
    };
    exports.FIRST_KEY_INDEX = FIRST_KEY_INDEX;
    exports.IS_READ_ONLY = true;
    function transformArguments(group, consumer, streams, options) {
      const args = ["XREADGROUP", "GROUP", group, consumer];
      if (options?.COUNT) {
        args.push("COUNT", options.COUNT.toString());
      }
      if (typeof options?.BLOCK === "number") {
        args.push("BLOCK", options.BLOCK.toString());
      }
      if (options?.NOACK) {
        args.push("NOACK");
      }
      args.push("STREAMS");
      const streamsArray = Array.isArray(streams) ? streams : [streams], argsLength = args.length;
      for (let i = 0; i < streamsArray.length; i++) {
        const stream = streamsArray[i];
        args[argsLength + i] = stream.key;
        args[argsLength + streamsArray.length + i] = stream.id;
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformStreamsMessagesReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/XREVRANGE.js
var require_XREVRANGE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XREVRANGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, start, end, options) {
      const args = ["XREVRANGE", key, start, end];
      if (options?.COUNT) {
        args.push("COUNT", options.COUNT.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformStreamMessagesReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/XSETID.js
var require_XSETID = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XSETID.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, lastId, options) {
      const args = ["XSETID", key, lastId];
      if (options?.ENTRIESADDED) {
        args.push("ENTRIESADDED", options.ENTRIESADDED.toString());
      }
      if (options?.MAXDELETEDID) {
        args.push("MAXDELETEDID", options.MAXDELETEDID);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/XTRIM.js
var require_XTRIM = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/XTRIM.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, strategy, threshold, options) {
      const args = ["XTRIM", key, strategy];
      if (options?.strategyModifier) {
        args.push(options.strategyModifier);
      }
      args.push(threshold.toString());
      if (options?.LIMIT) {
        args.push("LIMIT", options.LIMIT.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZADD.js
var require_ZADD = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZADD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, members, options) {
      const args = ["ZADD", key];
      if (options?.NX) {
        args.push("NX");
      } else {
        if (options?.XX) {
          args.push("XX");
        }
        if (options?.GT) {
          args.push("GT");
        } else if (options?.LT) {
          args.push("LT");
        }
      }
      if (options?.CH) {
        args.push("CH");
      }
      if (options?.INCR) {
        args.push("INCR");
      }
      for (const { score, value } of Array.isArray(members) ? members : [members]) {
        args.push((0, generic_transformers_1.transformNumberInfinityArgument)(score), value);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_2 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_2.transformNumberInfinityReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/ZCARD.js
var require_ZCARD = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZCARD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["ZCARD", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZCOUNT.js
var require_ZCOUNT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZCOUNT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, min, max) {
      return [
        "ZCOUNT",
        key,
        (0, generic_transformers_1.transformStringNumberInfinityArgument)(min),
        (0, generic_transformers_1.transformStringNumberInfinityArgument)(max)
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZDIFF.js
var require_ZDIFF = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZDIFF.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 2;
    exports.IS_READ_ONLY = true;
    function transformArguments(keys) {
      return (0, generic_transformers_1.pushVerdictArgument)(["ZDIFF"], keys);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZDIFF_WITHSCORES.js
var require_ZDIFF_WITHSCORES = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZDIFF_WITHSCORES.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var ZDIFF_1 = require_ZDIFF();
    var ZDIFF_2 = require_ZDIFF();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return ZDIFF_2.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return ZDIFF_2.IS_READ_ONLY;
    } });
    function transformArguments(...args) {
      return [
        ...(0, ZDIFF_1.transformArguments)(...args),
        "WITHSCORES"
      ];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformSortedSetWithScoresReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/ZDIFFSTORE.js
var require_ZDIFFSTORE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZDIFFSTORE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(destination, keys) {
      return (0, generic_transformers_1.pushVerdictArgument)(["ZDIFFSTORE", destination], keys);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZINCRBY.js
var require_ZINCRBY = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZINCRBY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, increment, member) {
      return [
        "ZINCRBY",
        key,
        (0, generic_transformers_1.transformNumberInfinityArgument)(increment),
        member
      ];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_2 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_2.transformNumberInfinityReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/ZINTER.js
var require_ZINTER = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZINTER.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 2;
    exports.IS_READ_ONLY = true;
    function transformArguments(keys, options) {
      const args = (0, generic_transformers_1.pushVerdictArgument)(["ZINTER"], keys);
      if (options?.WEIGHTS) {
        args.push("WEIGHTS", ...options.WEIGHTS.map((weight) => weight.toString()));
      }
      if (options?.AGGREGATE) {
        args.push("AGGREGATE", options.AGGREGATE);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZINTER_WITHSCORES.js
var require_ZINTER_WITHSCORES = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZINTER_WITHSCORES.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var ZINTER_1 = require_ZINTER();
    var ZINTER_2 = require_ZINTER();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return ZINTER_2.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return ZINTER_2.IS_READ_ONLY;
    } });
    function transformArguments(...args) {
      return [
        ...(0, ZINTER_1.transformArguments)(...args),
        "WITHSCORES"
      ];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformSortedSetWithScoresReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/ZINTERCARD.js
var require_ZINTERCARD = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZINTERCARD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 2;
    exports.IS_READ_ONLY = true;
    function transformArguments(keys, limit) {
      const args = (0, generic_transformers_1.pushVerdictArgument)(["ZINTERCARD"], keys);
      if (limit) {
        args.push("LIMIT", limit.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZINTERSTORE.js
var require_ZINTERSTORE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZINTERSTORE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(destination, keys, options) {
      const args = (0, generic_transformers_1.pushVerdictArgument)(["ZINTERSTORE", destination], keys);
      if (options?.WEIGHTS) {
        args.push("WEIGHTS", ...options.WEIGHTS.map((weight) => weight.toString()));
      }
      if (options?.AGGREGATE) {
        args.push("AGGREGATE", options.AGGREGATE);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZLEXCOUNT.js
var require_ZLEXCOUNT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZLEXCOUNT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, min, max) {
      return [
        "ZLEXCOUNT",
        key,
        min,
        max
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZMSCORE.js
var require_ZMSCORE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZMSCORE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, member) {
      return (0, generic_transformers_1.pushVerdictArguments)(["ZMSCORE", key], member);
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_2 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_2.transformNumberInfinityNullArrayReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/ZPOPMAX.js
var require_ZPOPMAX = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZPOPMAX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return [
        "ZPOPMAX",
        key
      ];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformSortedSetMemberNullReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/ZPOPMAX_COUNT.js
var require_ZPOPMAX_COUNT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZPOPMAX_COUNT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var ZPOPMAX_1 = require_ZPOPMAX();
    var ZPOPMAX_2 = require_ZPOPMAX();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return ZPOPMAX_2.FIRST_KEY_INDEX;
    } });
    function transformArguments(key, count) {
      return [
        ...(0, ZPOPMAX_1.transformArguments)(key),
        count.toString()
      ];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformSortedSetWithScoresReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/ZPOPMIN.js
var require_ZPOPMIN = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZPOPMIN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return [
        "ZPOPMIN",
        key
      ];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformSortedSetMemberNullReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/ZPOPMIN_COUNT.js
var require_ZPOPMIN_COUNT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZPOPMIN_COUNT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var ZPOPMIN_1 = require_ZPOPMIN();
    var ZPOPMIN_2 = require_ZPOPMIN();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return ZPOPMIN_2.FIRST_KEY_INDEX;
    } });
    function transformArguments(key, count) {
      return [
        ...(0, ZPOPMIN_1.transformArguments)(key),
        count.toString()
      ];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformSortedSetWithScoresReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/ZRANDMEMBER.js
var require_ZRANDMEMBER = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZRANDMEMBER.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["ZRANDMEMBER", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZRANDMEMBER_COUNT.js
var require_ZRANDMEMBER_COUNT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZRANDMEMBER_COUNT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var ZRANDMEMBER_1 = require_ZRANDMEMBER();
    var ZRANDMEMBER_2 = require_ZRANDMEMBER();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return ZRANDMEMBER_2.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return ZRANDMEMBER_2.IS_READ_ONLY;
    } });
    function transformArguments(key, count) {
      return [
        ...(0, ZRANDMEMBER_1.transformArguments)(key),
        count.toString()
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZRANDMEMBER_COUNT_WITHSCORES.js
var require_ZRANDMEMBER_COUNT_WITHSCORES = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZRANDMEMBER_COUNT_WITHSCORES.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var ZRANDMEMBER_COUNT_1 = require_ZRANDMEMBER_COUNT();
    var ZRANDMEMBER_COUNT_2 = require_ZRANDMEMBER_COUNT();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return ZRANDMEMBER_COUNT_2.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return ZRANDMEMBER_COUNT_2.IS_READ_ONLY;
    } });
    function transformArguments(...args) {
      return [
        ...(0, ZRANDMEMBER_COUNT_1.transformArguments)(...args),
        "WITHSCORES"
      ];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformSortedSetWithScoresReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/ZRANGE.js
var require_ZRANGE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZRANGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, min, max, options) {
      const args = [
        "ZRANGE",
        key,
        (0, generic_transformers_1.transformStringNumberInfinityArgument)(min),
        (0, generic_transformers_1.transformStringNumberInfinityArgument)(max)
      ];
      switch (options?.BY) {
        case "SCORE":
          args.push("BYSCORE");
          break;
        case "LEX":
          args.push("BYLEX");
          break;
      }
      if (options?.REV) {
        args.push("REV");
      }
      if (options?.LIMIT) {
        args.push("LIMIT", options.LIMIT.offset.toString(), options.LIMIT.count.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZRANGE_WITHSCORES.js
var require_ZRANGE_WITHSCORES = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZRANGE_WITHSCORES.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var ZRANGE_1 = require_ZRANGE();
    var ZRANGE_2 = require_ZRANGE();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return ZRANGE_2.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return ZRANGE_2.IS_READ_ONLY;
    } });
    function transformArguments(...args) {
      return [
        ...(0, ZRANGE_1.transformArguments)(...args),
        "WITHSCORES"
      ];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformSortedSetWithScoresReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/ZRANGEBYLEX.js
var require_ZRANGEBYLEX = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZRANGEBYLEX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, min, max, options) {
      const args = [
        "ZRANGEBYLEX",
        key,
        (0, generic_transformers_1.transformStringNumberInfinityArgument)(min),
        (0, generic_transformers_1.transformStringNumberInfinityArgument)(max)
      ];
      if (options?.LIMIT) {
        args.push("LIMIT", options.LIMIT.offset.toString(), options.LIMIT.count.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZRANGEBYSCORE.js
var require_ZRANGEBYSCORE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZRANGEBYSCORE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, min, max, options) {
      const args = [
        "ZRANGEBYSCORE",
        key,
        (0, generic_transformers_1.transformStringNumberInfinityArgument)(min),
        (0, generic_transformers_1.transformStringNumberInfinityArgument)(max)
      ];
      if (options?.LIMIT) {
        args.push("LIMIT", options.LIMIT.offset.toString(), options.LIMIT.count.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZRANGEBYSCORE_WITHSCORES.js
var require_ZRANGEBYSCORE_WITHSCORES = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZRANGEBYSCORE_WITHSCORES.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var ZRANGEBYSCORE_1 = require_ZRANGEBYSCORE();
    var ZRANGEBYSCORE_2 = require_ZRANGEBYSCORE();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return ZRANGEBYSCORE_2.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return ZRANGEBYSCORE_2.IS_READ_ONLY;
    } });
    function transformArguments(key, min, max, options) {
      return [
        ...(0, ZRANGEBYSCORE_1.transformArguments)(key, min, max, options),
        "WITHSCORES"
      ];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformSortedSetWithScoresReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/ZRANGESTORE.js
var require_ZRANGESTORE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZRANGESTORE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(dst, src, min, max, options) {
      const args = [
        "ZRANGESTORE",
        dst,
        src,
        (0, generic_transformers_1.transformStringNumberInfinityArgument)(min),
        (0, generic_transformers_1.transformStringNumberInfinityArgument)(max)
      ];
      switch (options?.BY) {
        case "SCORE":
          args.push("BYSCORE");
          break;
        case "LEX":
          args.push("BYLEX");
          break;
      }
      if (options?.REV) {
        args.push("REV");
      }
      if (options?.LIMIT) {
        args.push("LIMIT", options.LIMIT.offset.toString(), options.LIMIT.count.toString());
      }
      if (options?.WITHSCORES) {
        args.push("WITHSCORES");
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      if (typeof reply !== "number") {
        throw new TypeError(`Upgrade to Redis 6.2.5 and up (https://github.com/redis/redis/pull/9089)`);
      }
      return reply;
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZRANK.js
var require_ZRANK = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZRANK.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, member) {
      return ["ZRANK", key, member];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZREM.js
var require_ZREM = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZREM.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, member) {
      return (0, generic_transformers_1.pushVerdictArguments)(["ZREM", key], member);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZREMRANGEBYLEX.js
var require_ZREMRANGEBYLEX = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZREMRANGEBYLEX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, min, max) {
      return [
        "ZREMRANGEBYLEX",
        key,
        (0, generic_transformers_1.transformStringNumberInfinityArgument)(min),
        (0, generic_transformers_1.transformStringNumberInfinityArgument)(max)
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZREMRANGEBYRANK.js
var require_ZREMRANGEBYRANK = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZREMRANGEBYRANK.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, start, stop) {
      return ["ZREMRANGEBYRANK", key, start.toString(), stop.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZREMRANGEBYSCORE.js
var require_ZREMRANGEBYSCORE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZREMRANGEBYSCORE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, min, max) {
      return [
        "ZREMRANGEBYSCORE",
        key,
        (0, generic_transformers_1.transformStringNumberInfinityArgument)(min),
        (0, generic_transformers_1.transformStringNumberInfinityArgument)(max)
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZREVRANK.js
var require_ZREVRANK = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZREVRANK.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, member) {
      return ["ZREVRANK", key, member];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZSCAN.js
var require_ZSCAN = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZSCAN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, cursor, options) {
      return (0, generic_transformers_1.pushScanArguments)([
        "ZSCAN",
        key
      ], cursor, options);
    }
    exports.transformArguments = transformArguments;
    function transformReply([cursor, rawMembers]) {
      const parsedMembers = [];
      for (let i = 0; i < rawMembers.length; i += 2) {
        parsedMembers.push({
          value: rawMembers[i],
          score: (0, generic_transformers_1.transformNumberInfinityReply)(rawMembers[i + 1])
        });
      }
      return {
        cursor: Number(cursor),
        members: parsedMembers
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZSCORE.js
var require_ZSCORE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZSCORE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, member) {
      return ["ZSCORE", key, member];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformNumberInfinityNullReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/ZUNION.js
var require_ZUNION = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZUNION.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 2;
    exports.IS_READ_ONLY = true;
    function transformArguments(keys, options) {
      const args = (0, generic_transformers_1.pushVerdictArgument)(["ZUNION"], keys);
      if (options?.WEIGHTS) {
        args.push("WEIGHTS", ...options.WEIGHTS.map((weight) => weight.toString()));
      }
      if (options?.AGGREGATE) {
        args.push("AGGREGATE", options.AGGREGATE);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ZUNION_WITHSCORES.js
var require_ZUNION_WITHSCORES = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZUNION_WITHSCORES.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var ZUNION_1 = require_ZUNION();
    var ZUNION_2 = require_ZUNION();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return ZUNION_2.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return ZUNION_2.IS_READ_ONLY;
    } });
    function transformArguments(...args) {
      return [
        ...(0, ZUNION_1.transformArguments)(...args),
        "WITHSCORES"
      ];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformSortedSetWithScoresReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/ZUNIONSTORE.js
var require_ZUNIONSTORE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ZUNIONSTORE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(destination, keys, options) {
      const args = (0, generic_transformers_1.pushVerdictArgument)(["ZUNIONSTORE", destination], keys);
      if (options?.WEIGHTS) {
        args.push("WEIGHTS", ...options.WEIGHTS.map((weight) => weight.toString()));
      }
      if (options?.AGGREGATE) {
        args.push("AGGREGATE", options.AGGREGATE);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/cluster/commands.js
var require_commands = __commonJS({
  "node_modules/@redis/client/dist/lib/cluster/commands.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var APPEND = require_APPEND();
    var BITCOUNT = require_BITCOUNT();
    var BITFIELD_RO = require_BITFIELD_RO();
    var BITFIELD = require_BITFIELD();
    var BITOP = require_BITOP();
    var BITPOS = require_BITPOS();
    var BLMOVE = require_BLMOVE();
    var BLMPOP = require_BLMPOP();
    var BLPOP = require_BLPOP();
    var BRPOP = require_BRPOP();
    var BRPOPLPUSH = require_BRPOPLPUSH();
    var BZMPOP = require_BZMPOP();
    var BZPOPMAX = require_BZPOPMAX();
    var BZPOPMIN = require_BZPOPMIN();
    var COPY = require_COPY();
    var DECR = require_DECR();
    var DECRBY = require_DECRBY();
    var DEL = require_DEL();
    var DUMP = require_DUMP();
    var EVAL_RO = require_EVAL_RO();
    var EVAL = require_EVAL();
    var EVALSHA_RO = require_EVALSHA_RO();
    var EVALSHA = require_EVALSHA();
    var EXISTS = require_EXISTS();
    var EXPIRE = require_EXPIRE();
    var EXPIREAT = require_EXPIREAT();
    var EXPIRETIME = require_EXPIRETIME();
    var FCALL_RO = require_FCALL_RO();
    var FCALL = require_FCALL();
    var GEOADD = require_GEOADD();
    var GEODIST = require_GEODIST();
    var GEOHASH = require_GEOHASH();
    var GEOPOS = require_GEOPOS();
    var GEORADIUS_RO_WITH = require_GEORADIUS_RO_WITH();
    var GEORADIUS_RO = require_GEORADIUS_RO();
    var GEORADIUS_WITH = require_GEORADIUS_WITH();
    var GEORADIUS = require_GEORADIUS();
    var GEORADIUSBYMEMBER_RO_WITH = require_GEORADIUSBYMEMBER_RO_WITH();
    var GEORADIUSBYMEMBER_RO = require_GEORADIUSBYMEMBER_RO();
    var GEORADIUSBYMEMBER_WITH = require_GEORADIUSBYMEMBER_WITH();
    var GEORADIUSBYMEMBER = require_GEORADIUSBYMEMBER();
    var GEORADIUSBYMEMBERSTORE = require_GEORADIUSBYMEMBERSTORE();
    var GEORADIUSSTORE = require_GEORADIUSSTORE();
    var GEOSEARCH_WITH = require_GEOSEARCH_WITH();
    var GEOSEARCH = require_GEOSEARCH();
    var GEOSEARCHSTORE = require_GEOSEARCHSTORE();
    var GET = require_GET();
    var GETBIT = require_GETBIT();
    var GETDEL = require_GETDEL();
    var GETEX = require_GETEX();
    var GETRANGE = require_GETRANGE();
    var GETSET = require_GETSET();
    var HDEL = require_HDEL();
    var HEXISTS = require_HEXISTS();
    var HGET = require_HGET();
    var HGETALL = require_HGETALL();
    var HINCRBY = require_HINCRBY();
    var HINCRBYFLOAT = require_HINCRBYFLOAT();
    var HKEYS = require_HKEYS();
    var HLEN = require_HLEN();
    var HMGET = require_HMGET();
    var HRANDFIELD_COUNT_WITHVALUES = require_HRANDFIELD_COUNT_WITHVALUES();
    var HRANDFIELD_COUNT = require_HRANDFIELD_COUNT();
    var HRANDFIELD = require_HRANDFIELD();
    var HSCAN = require_HSCAN();
    var HSET = require_HSET();
    var HSETNX = require_HSETNX();
    var HSTRLEN = require_HSTRLEN();
    var HVALS = require_HVALS();
    var INCR = require_INCR();
    var INCRBY = require_INCRBY();
    var INCRBYFLOAT = require_INCRBYFLOAT();
    var LCS_IDX_WITHMATCHLEN = require_LCS_IDX_WITHMATCHLEN();
    var LCS_IDX = require_LCS_IDX();
    var LCS_LEN = require_LCS_LEN();
    var LCS = require_LCS();
    var LINDEX = require_LINDEX();
    var LINSERT = require_LINSERT();
    var LLEN = require_LLEN();
    var LMOVE = require_LMOVE();
    var LMPOP = require_LMPOP();
    var LPOP_COUNT = require_LPOP_COUNT();
    var LPOP = require_LPOP();
    var LPOS_COUNT = require_LPOS_COUNT();
    var LPOS = require_LPOS();
    var LPUSH = require_LPUSH();
    var LPUSHX = require_LPUSHX();
    var LRANGE = require_LRANGE();
    var LREM = require_LREM();
    var LSET = require_LSET();
    var LTRIM = require_LTRIM();
    var MGET = require_MGET();
    var MIGRATE = require_MIGRATE();
    var MSET = require_MSET();
    var MSETNX = require_MSETNX();
    var OBJECT_ENCODING = require_OBJECT_ENCODING();
    var OBJECT_FREQ = require_OBJECT_FREQ();
    var OBJECT_IDLETIME = require_OBJECT_IDLETIME();
    var OBJECT_REFCOUNT = require_OBJECT_REFCOUNT();
    var PERSIST = require_PERSIST();
    var PEXPIRE = require_PEXPIRE();
    var PEXPIREAT = require_PEXPIREAT();
    var PEXPIRETIME = require_PEXPIRETIME();
    var PFADD = require_PFADD();
    var PFCOUNT = require_PFCOUNT();
    var PFMERGE = require_PFMERGE();
    var PSETEX = require_PSETEX();
    var PTTL = require_PTTL();
    var PUBLISH = require_PUBLISH();
    var RENAME = require_RENAME();
    var RENAMENX = require_RENAMENX();
    var RESTORE = require_RESTORE();
    var RPOP_COUNT = require_RPOP_COUNT();
    var RPOP = require_RPOP();
    var RPOPLPUSH = require_RPOPLPUSH();
    var RPUSH = require_RPUSH();
    var RPUSHX = require_RPUSHX();
    var SADD = require_SADD();
    var SCARD = require_SCARD();
    var SDIFF = require_SDIFF();
    var SDIFFSTORE = require_SDIFFSTORE();
    var SET = require_SET();
    var SETBIT = require_SETBIT();
    var SETEX = require_SETEX();
    var SETNX = require_SETNX();
    var SETRANGE = require_SETRANGE();
    var SINTER = require_SINTER();
    var SINTERCARD = require_SINTERCARD();
    var SINTERSTORE = require_SINTERSTORE();
    var SISMEMBER = require_SISMEMBER();
    var SMEMBERS = require_SMEMBERS();
    var SMISMEMBER = require_SMISMEMBER();
    var SMOVE = require_SMOVE();
    var SORT_RO = require_SORT_RO();
    var SORT_STORE = require_SORT_STORE();
    var SORT = require_SORT();
    var SPOP = require_SPOP();
    var SPUBLISH = require_SPUBLISH();
    var SRANDMEMBER_COUNT = require_SRANDMEMBER_COUNT();
    var SRANDMEMBER = require_SRANDMEMBER();
    var SREM = require_SREM();
    var SSCAN = require_SSCAN();
    var STRLEN = require_STRLEN();
    var SUNION = require_SUNION();
    var SUNIONSTORE = require_SUNIONSTORE();
    var TOUCH = require_TOUCH();
    var TTL = require_TTL();
    var TYPE = require_TYPE();
    var UNLINK = require_UNLINK();
    var WATCH = require_WATCH();
    var XACK = require_XACK();
    var XADD = require_XADD();
    var XAUTOCLAIM_JUSTID = require_XAUTOCLAIM_JUSTID();
    var XAUTOCLAIM = require_XAUTOCLAIM();
    var XCLAIM_JUSTID = require_XCLAIM_JUSTID();
    var XCLAIM = require_XCLAIM();
    var XDEL = require_XDEL();
    var XGROUP_CREATE = require_XGROUP_CREATE();
    var XGROUP_CREATECONSUMER = require_XGROUP_CREATECONSUMER();
    var XGROUP_DELCONSUMER = require_XGROUP_DELCONSUMER();
    var XGROUP_DESTROY = require_XGROUP_DESTROY();
    var XGROUP_SETID = require_XGROUP_SETID();
    var XINFO_CONSUMERS = require_XINFO_CONSUMERS();
    var XINFO_GROUPS = require_XINFO_GROUPS();
    var XINFO_STREAM = require_XINFO_STREAM();
    var XLEN = require_XLEN();
    var XPENDING_RANGE = require_XPENDING_RANGE();
    var XPENDING = require_XPENDING();
    var XRANGE = require_XRANGE();
    var XREAD = require_XREAD();
    var XREADGROUP = require_XREADGROUP();
    var XREVRANGE = require_XREVRANGE();
    var XSETID = require_XSETID();
    var XTRIM = require_XTRIM();
    var ZADD = require_ZADD();
    var ZCARD = require_ZCARD();
    var ZCOUNT = require_ZCOUNT();
    var ZDIFF_WITHSCORES = require_ZDIFF_WITHSCORES();
    var ZDIFF = require_ZDIFF();
    var ZDIFFSTORE = require_ZDIFFSTORE();
    var ZINCRBY = require_ZINCRBY();
    var ZINTER_WITHSCORES = require_ZINTER_WITHSCORES();
    var ZINTER = require_ZINTER();
    var ZINTERCARD = require_ZINTERCARD();
    var ZINTERSTORE = require_ZINTERSTORE();
    var ZLEXCOUNT = require_ZLEXCOUNT();
    var ZMPOP = require_ZMPOP();
    var ZMSCORE = require_ZMSCORE();
    var ZPOPMAX_COUNT = require_ZPOPMAX_COUNT();
    var ZPOPMAX = require_ZPOPMAX();
    var ZPOPMIN_COUNT = require_ZPOPMIN_COUNT();
    var ZPOPMIN = require_ZPOPMIN();
    var ZRANDMEMBER_COUNT_WITHSCORES = require_ZRANDMEMBER_COUNT_WITHSCORES();
    var ZRANDMEMBER_COUNT = require_ZRANDMEMBER_COUNT();
    var ZRANDMEMBER = require_ZRANDMEMBER();
    var ZRANGE_WITHSCORES = require_ZRANGE_WITHSCORES();
    var ZRANGE = require_ZRANGE();
    var ZRANGEBYLEX = require_ZRANGEBYLEX();
    var ZRANGEBYSCORE_WITHSCORES = require_ZRANGEBYSCORE_WITHSCORES();
    var ZRANGEBYSCORE = require_ZRANGEBYSCORE();
    var ZRANGESTORE = require_ZRANGESTORE();
    var ZRANK = require_ZRANK();
    var ZREM = require_ZREM();
    var ZREMRANGEBYLEX = require_ZREMRANGEBYLEX();
    var ZREMRANGEBYRANK = require_ZREMRANGEBYRANK();
    var ZREMRANGEBYSCORE = require_ZREMRANGEBYSCORE();
    var ZREVRANK = require_ZREVRANK();
    var ZSCAN = require_ZSCAN();
    var ZSCORE = require_ZSCORE();
    var ZUNION_WITHSCORES = require_ZUNION_WITHSCORES();
    var ZUNION = require_ZUNION();
    var ZUNIONSTORE = require_ZUNIONSTORE();
    exports.default = {
      APPEND,
      append: APPEND,
      BITCOUNT,
      bitCount: BITCOUNT,
      BITFIELD_RO,
      bitFieldRo: BITFIELD_RO,
      BITFIELD,
      bitField: BITFIELD,
      BITOP,
      bitOp: BITOP,
      BITPOS,
      bitPos: BITPOS,
      BLMOVE,
      blMove: BLMOVE,
      BLMPOP,
      blmPop: BLMPOP,
      BLPOP,
      blPop: BLPOP,
      BRPOP,
      brPop: BRPOP,
      BRPOPLPUSH,
      brPopLPush: BRPOPLPUSH,
      BZMPOP,
      bzmPop: BZMPOP,
      BZPOPMAX,
      bzPopMax: BZPOPMAX,
      BZPOPMIN,
      bzPopMin: BZPOPMIN,
      COPY,
      copy: COPY,
      DECR,
      decr: DECR,
      DECRBY,
      decrBy: DECRBY,
      DEL,
      del: DEL,
      DUMP,
      dump: DUMP,
      EVAL_RO,
      evalRo: EVAL_RO,
      EVAL,
      eval: EVAL,
      EVALSHA,
      evalSha: EVALSHA,
      EVALSHA_RO,
      evalShaRo: EVALSHA_RO,
      EXISTS,
      exists: EXISTS,
      EXPIRE,
      expire: EXPIRE,
      EXPIREAT,
      expireAt: EXPIREAT,
      EXPIRETIME,
      expireTime: EXPIRETIME,
      FCALL_RO,
      fCallRo: FCALL_RO,
      FCALL,
      fCall: FCALL,
      GEOADD,
      geoAdd: GEOADD,
      GEODIST,
      geoDist: GEODIST,
      GEOHASH,
      geoHash: GEOHASH,
      GEOPOS,
      geoPos: GEOPOS,
      GEORADIUS_RO_WITH,
      geoRadiusRoWith: GEORADIUS_RO_WITH,
      GEORADIUS_RO,
      geoRadiusRo: GEORADIUS_RO,
      GEORADIUS_WITH,
      geoRadiusWith: GEORADIUS_WITH,
      GEORADIUS,
      geoRadius: GEORADIUS,
      GEORADIUSBYMEMBER_RO_WITH,
      geoRadiusByMemberRoWith: GEORADIUSBYMEMBER_RO_WITH,
      GEORADIUSBYMEMBER_RO,
      geoRadiusByMemberRo: GEORADIUSBYMEMBER_RO,
      GEORADIUSBYMEMBER_WITH,
      geoRadiusByMemberWith: GEORADIUSBYMEMBER_WITH,
      GEORADIUSBYMEMBER,
      geoRadiusByMember: GEORADIUSBYMEMBER,
      GEORADIUSBYMEMBERSTORE,
      geoRadiusByMemberStore: GEORADIUSBYMEMBERSTORE,
      GEORADIUSSTORE,
      geoRadiusStore: GEORADIUSSTORE,
      GEOSEARCH_WITH,
      geoSearchWith: GEOSEARCH_WITH,
      GEOSEARCH,
      geoSearch: GEOSEARCH,
      GEOSEARCHSTORE,
      geoSearchStore: GEOSEARCHSTORE,
      GET,
      get: GET,
      GETBIT,
      getBit: GETBIT,
      GETDEL,
      getDel: GETDEL,
      GETEX,
      getEx: GETEX,
      GETRANGE,
      getRange: GETRANGE,
      GETSET,
      getSet: GETSET,
      HDEL,
      hDel: HDEL,
      HEXISTS,
      hExists: HEXISTS,
      HGET,
      hGet: HGET,
      HGETALL,
      hGetAll: HGETALL,
      HINCRBY,
      hIncrBy: HINCRBY,
      HINCRBYFLOAT,
      hIncrByFloat: HINCRBYFLOAT,
      HKEYS,
      hKeys: HKEYS,
      HLEN,
      hLen: HLEN,
      HMGET,
      hmGet: HMGET,
      HRANDFIELD_COUNT_WITHVALUES,
      hRandFieldCountWithValues: HRANDFIELD_COUNT_WITHVALUES,
      HRANDFIELD_COUNT,
      hRandFieldCount: HRANDFIELD_COUNT,
      HRANDFIELD,
      hRandField: HRANDFIELD,
      HSCAN,
      hScan: HSCAN,
      HSET,
      hSet: HSET,
      HSETNX,
      hSetNX: HSETNX,
      HSTRLEN,
      hStrLen: HSTRLEN,
      HVALS,
      hVals: HVALS,
      INCR,
      incr: INCR,
      INCRBY,
      incrBy: INCRBY,
      INCRBYFLOAT,
      incrByFloat: INCRBYFLOAT,
      LCS_IDX_WITHMATCHLEN,
      lcsIdxWithMatchLen: LCS_IDX_WITHMATCHLEN,
      LCS_IDX,
      lcsIdx: LCS_IDX,
      LCS_LEN,
      lcsLen: LCS_LEN,
      LCS,
      lcs: LCS,
      LINDEX,
      lIndex: LINDEX,
      LINSERT,
      lInsert: LINSERT,
      LLEN,
      lLen: LLEN,
      LMOVE,
      lMove: LMOVE,
      LMPOP,
      lmPop: LMPOP,
      LPOP_COUNT,
      lPopCount: LPOP_COUNT,
      LPOP,
      lPop: LPOP,
      LPOS_COUNT,
      lPosCount: LPOS_COUNT,
      LPOS,
      lPos: LPOS,
      LPUSH,
      lPush: LPUSH,
      LPUSHX,
      lPushX: LPUSHX,
      LRANGE,
      lRange: LRANGE,
      LREM,
      lRem: LREM,
      LSET,
      lSet: LSET,
      LTRIM,
      lTrim: LTRIM,
      MGET,
      mGet: MGET,
      MIGRATE,
      migrate: MIGRATE,
      MSET,
      mSet: MSET,
      MSETNX,
      mSetNX: MSETNX,
      OBJECT_ENCODING,
      objectEncoding: OBJECT_ENCODING,
      OBJECT_FREQ,
      objectFreq: OBJECT_FREQ,
      OBJECT_IDLETIME,
      objectIdleTime: OBJECT_IDLETIME,
      OBJECT_REFCOUNT,
      objectRefCount: OBJECT_REFCOUNT,
      PERSIST,
      persist: PERSIST,
      PEXPIRE,
      pExpire: PEXPIRE,
      PEXPIREAT,
      pExpireAt: PEXPIREAT,
      PEXPIRETIME,
      pExpireTime: PEXPIRETIME,
      PFADD,
      pfAdd: PFADD,
      PFCOUNT,
      pfCount: PFCOUNT,
      PFMERGE,
      pfMerge: PFMERGE,
      PSETEX,
      pSetEx: PSETEX,
      PTTL,
      pTTL: PTTL,
      PUBLISH,
      publish: PUBLISH,
      RENAME,
      rename: RENAME,
      RENAMENX,
      renameNX: RENAMENX,
      RESTORE,
      restore: RESTORE,
      RPOP_COUNT,
      rPopCount: RPOP_COUNT,
      RPOP,
      rPop: RPOP,
      RPOPLPUSH,
      rPopLPush: RPOPLPUSH,
      RPUSH,
      rPush: RPUSH,
      RPUSHX,
      rPushX: RPUSHX,
      SADD,
      sAdd: SADD,
      SCARD,
      sCard: SCARD,
      SDIFF,
      sDiff: SDIFF,
      SDIFFSTORE,
      sDiffStore: SDIFFSTORE,
      SINTER,
      sInter: SINTER,
      SINTERCARD,
      sInterCard: SINTERCARD,
      SINTERSTORE,
      sInterStore: SINTERSTORE,
      SET,
      set: SET,
      SETBIT,
      setBit: SETBIT,
      SETEX,
      setEx: SETEX,
      SETNX,
      setNX: SETNX,
      SETRANGE,
      setRange: SETRANGE,
      SISMEMBER,
      sIsMember: SISMEMBER,
      SMEMBERS,
      sMembers: SMEMBERS,
      SMISMEMBER,
      smIsMember: SMISMEMBER,
      SMOVE,
      sMove: SMOVE,
      SORT_RO,
      sortRo: SORT_RO,
      SORT_STORE,
      sortStore: SORT_STORE,
      SORT,
      sort: SORT,
      SPOP,
      sPop: SPOP,
      SPUBLISH,
      sPublish: SPUBLISH,
      SRANDMEMBER_COUNT,
      sRandMemberCount: SRANDMEMBER_COUNT,
      SRANDMEMBER,
      sRandMember: SRANDMEMBER,
      SREM,
      sRem: SREM,
      SSCAN,
      sScan: SSCAN,
      STRLEN,
      strLen: STRLEN,
      SUNION,
      sUnion: SUNION,
      SUNIONSTORE,
      sUnionStore: SUNIONSTORE,
      TOUCH,
      touch: TOUCH,
      TTL,
      ttl: TTL,
      TYPE,
      type: TYPE,
      UNLINK,
      unlink: UNLINK,
      WATCH,
      watch: WATCH,
      XACK,
      xAck: XACK,
      XADD,
      xAdd: XADD,
      XAUTOCLAIM_JUSTID,
      xAutoClaimJustId: XAUTOCLAIM_JUSTID,
      XAUTOCLAIM,
      xAutoClaim: XAUTOCLAIM,
      XCLAIM,
      xClaim: XCLAIM,
      XCLAIM_JUSTID,
      xClaimJustId: XCLAIM_JUSTID,
      XDEL,
      xDel: XDEL,
      XGROUP_CREATE,
      xGroupCreate: XGROUP_CREATE,
      XGROUP_CREATECONSUMER,
      xGroupCreateConsumer: XGROUP_CREATECONSUMER,
      XGROUP_DELCONSUMER,
      xGroupDelConsumer: XGROUP_DELCONSUMER,
      XGROUP_DESTROY,
      xGroupDestroy: XGROUP_DESTROY,
      XGROUP_SETID,
      xGroupSetId: XGROUP_SETID,
      XINFO_CONSUMERS,
      xInfoConsumers: XINFO_CONSUMERS,
      XINFO_GROUPS,
      xInfoGroups: XINFO_GROUPS,
      XINFO_STREAM,
      xInfoStream: XINFO_STREAM,
      XLEN,
      xLen: XLEN,
      XPENDING_RANGE,
      xPendingRange: XPENDING_RANGE,
      XPENDING,
      xPending: XPENDING,
      XRANGE,
      xRange: XRANGE,
      XREAD,
      xRead: XREAD,
      XREADGROUP,
      xReadGroup: XREADGROUP,
      XREVRANGE,
      xRevRange: XREVRANGE,
      XSETID,
      xSetId: XSETID,
      XTRIM,
      xTrim: XTRIM,
      ZADD,
      zAdd: ZADD,
      ZCARD,
      zCard: ZCARD,
      ZCOUNT,
      zCount: ZCOUNT,
      ZDIFF_WITHSCORES,
      zDiffWithScores: ZDIFF_WITHSCORES,
      ZDIFF,
      zDiff: ZDIFF,
      ZDIFFSTORE,
      zDiffStore: ZDIFFSTORE,
      ZINCRBY,
      zIncrBy: ZINCRBY,
      ZINTER_WITHSCORES,
      zInterWithScores: ZINTER_WITHSCORES,
      ZINTER,
      zInter: ZINTER,
      ZINTERCARD,
      zInterCard: ZINTERCARD,
      ZINTERSTORE,
      zInterStore: ZINTERSTORE,
      ZLEXCOUNT,
      zLexCount: ZLEXCOUNT,
      ZMPOP,
      zmPop: ZMPOP,
      ZMSCORE,
      zmScore: ZMSCORE,
      ZPOPMAX_COUNT,
      zPopMaxCount: ZPOPMAX_COUNT,
      ZPOPMAX,
      zPopMax: ZPOPMAX,
      ZPOPMIN_COUNT,
      zPopMinCount: ZPOPMIN_COUNT,
      ZPOPMIN,
      zPopMin: ZPOPMIN,
      ZRANDMEMBER_COUNT_WITHSCORES,
      zRandMemberCountWithScores: ZRANDMEMBER_COUNT_WITHSCORES,
      ZRANDMEMBER_COUNT,
      zRandMemberCount: ZRANDMEMBER_COUNT,
      ZRANDMEMBER,
      zRandMember: ZRANDMEMBER,
      ZRANGE_WITHSCORES,
      zRangeWithScores: ZRANGE_WITHSCORES,
      ZRANGE,
      zRange: ZRANGE,
      ZRANGEBYLEX,
      zRangeByLex: ZRANGEBYLEX,
      ZRANGEBYSCORE_WITHSCORES,
      zRangeByScoreWithScores: ZRANGEBYSCORE_WITHSCORES,
      ZRANGEBYSCORE,
      zRangeByScore: ZRANGEBYSCORE,
      ZRANGESTORE,
      zRangeStore: ZRANGESTORE,
      ZRANK,
      zRank: ZRANK,
      ZREM,
      zRem: ZREM,
      ZREMRANGEBYLEX,
      zRemRangeByLex: ZREMRANGEBYLEX,
      ZREMRANGEBYRANK,
      zRemRangeByRank: ZREMRANGEBYRANK,
      ZREMRANGEBYSCORE,
      zRemRangeByScore: ZREMRANGEBYSCORE,
      ZREVRANK,
      zRevRank: ZREVRANK,
      ZSCAN,
      zScan: ZSCAN,
      ZSCORE,
      zScore: ZSCORE,
      ZUNION_WITHSCORES,
      zUnionWithScores: ZUNION_WITHSCORES,
      ZUNION,
      zUnion: ZUNION,
      ZUNIONSTORE,
      zUnionStore: ZUNIONSTORE
    };
  }
});

// node_modules/@redis/client/dist/lib/commands/ACL_CAT.js
var require_ACL_CAT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ACL_CAT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(categoryName) {
      const args = ["ACL", "CAT"];
      if (categoryName) {
        args.push(categoryName);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ACL_DELUSER.js
var require_ACL_DELUSER = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ACL_DELUSER.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    var generic_transformers_1 = require_generic_transformers();
    function transformArguments(username) {
      return (0, generic_transformers_1.pushVerdictArguments)(["ACL", "DELUSER"], username);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ACL_DRYRUN.js
var require_ACL_DRYRUN = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ACL_DRYRUN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments(username, command) {
      return [
        "ACL",
        "DRYRUN",
        username,
        ...command
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ACL_GENPASS.js
var require_ACL_GENPASS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ACL_GENPASS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(bits) {
      const args = ["ACL", "GENPASS"];
      if (bits) {
        args.push(bits.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ACL_GETUSER.js
var require_ACL_GETUSER = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ACL_GETUSER.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = void 0;
    function transformArguments(username) {
      return ["ACL", "GETUSER", username];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return {
        flags: reply[1],
        passwords: reply[3],
        commands: reply[5],
        keys: reply[7],
        channels: reply[9],
        selectors: reply[11]
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/ACL_LIST.js
var require_ACL_LIST = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ACL_LIST.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["ACL", "LIST"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ACL_LOAD.js
var require_ACL_LOAD = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ACL_LOAD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["ACL", "LOAD"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ACL_LOG_RESET.js
var require_ACL_LOG_RESET = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ACL_LOG_RESET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["ACL", "LOG", "RESET"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ACL_LOG.js
var require_ACL_LOG = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ACL_LOG.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = void 0;
    function transformArguments(count) {
      const args = ["ACL", "LOG"];
      if (count) {
        args.push(count.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return reply.map((log) => ({
        count: log[1],
        reason: log[3],
        context: log[5],
        object: log[7],
        username: log[9],
        ageSeconds: Number(log[11]),
        clientInfo: log[13]
      }));
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/ACL_SAVE.js
var require_ACL_SAVE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ACL_SAVE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["ACL", "SAVE"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ACL_SETUSER.js
var require_ACL_SETUSER = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ACL_SETUSER.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    var generic_transformers_1 = require_generic_transformers();
    function transformArguments(username, rule) {
      return (0, generic_transformers_1.pushVerdictArguments)(["ACL", "SETUSER", username], rule);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ACL_USERS.js
var require_ACL_USERS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ACL_USERS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["ACL", "USERS"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ACL_WHOAMI.js
var require_ACL_WHOAMI = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ACL_WHOAMI.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["ACL", "WHOAMI"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ASKING.js
var require_ASKING = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ASKING.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["ASKING"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/AUTH.js
var require_AUTH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/AUTH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments({ username, password }) {
      if (!username) {
        return ["AUTH", password];
      }
      return ["AUTH", username, password];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/BGREWRITEAOF.js
var require_BGREWRITEAOF = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/BGREWRITEAOF.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["BGREWRITEAOF"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/BGSAVE.js
var require_BGSAVE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/BGSAVE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(options) {
      const args = ["BGSAVE"];
      if (options?.SCHEDULE) {
        args.push("SCHEDULE");
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLIENT_CACHING.js
var require_CLIENT_CACHING = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLIENT_CACHING.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(value) {
      return [
        "CLIENT",
        "CACHING",
        value ? "YES" : "NO"
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLIENT_GETNAME.js
var require_CLIENT_GETNAME = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLIENT_GETNAME.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["CLIENT", "GETNAME"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLIENT_GETREDIR.js
var require_CLIENT_GETREDIR = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLIENT_GETREDIR.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["CLIENT", "GETREDIR"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLIENT_ID.js
var require_CLIENT_ID = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLIENT_ID.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments() {
      return ["CLIENT", "ID"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLIENT_KILL.js
var require_CLIENT_KILL = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLIENT_KILL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.ClientKillFilters = void 0;
    var ClientKillFilters;
    (function(ClientKillFilters2) {
      ClientKillFilters2["ADDRESS"] = "ADDR";
      ClientKillFilters2["LOCAL_ADDRESS"] = "LADDR";
      ClientKillFilters2["ID"] = "ID";
      ClientKillFilters2["TYPE"] = "TYPE";
      ClientKillFilters2["USER"] = "USER";
      ClientKillFilters2["SKIP_ME"] = "SKIPME";
    })(ClientKillFilters || (exports.ClientKillFilters = ClientKillFilters = {}));
    function transformArguments(filters) {
      const args = ["CLIENT", "KILL"];
      if (Array.isArray(filters)) {
        for (const filter of filters) {
          pushFilter(args, filter);
        }
      } else {
        pushFilter(args, filters);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function pushFilter(args, filter) {
      if (filter === ClientKillFilters.SKIP_ME) {
        args.push("SKIPME");
        return;
      }
      args.push(filter.filter);
      switch (filter.filter) {
        case ClientKillFilters.ADDRESS:
          args.push(filter.address);
          break;
        case ClientKillFilters.LOCAL_ADDRESS:
          args.push(filter.localAddress);
          break;
        case ClientKillFilters.ID:
          args.push(typeof filter.id === "number" ? filter.id.toString() : filter.id);
          break;
        case ClientKillFilters.TYPE:
          args.push(filter.type);
          break;
        case ClientKillFilters.USER:
          args.push(filter.username);
          break;
        case ClientKillFilters.SKIP_ME:
          args.push(filter.skipMe ? "yes" : "no");
          break;
      }
    }
  }
});

// node_modules/@redis/client/dist/lib/commands/CLIENT_INFO.js
var require_CLIENT_INFO = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLIENT_INFO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments() {
      return ["CLIENT", "INFO"];
    }
    exports.transformArguments = transformArguments;
    var CLIENT_INFO_REGEX = /([^\s=]+)=([^\s]*)/g;
    function transformReply(rawReply) {
      const map = {};
      for (const item of rawReply.matchAll(CLIENT_INFO_REGEX)) {
        map[item[1]] = item[2];
      }
      const reply = {
        id: Number(map.id),
        addr: map.addr,
        fd: Number(map.fd),
        name: map.name,
        age: Number(map.age),
        idle: Number(map.idle),
        flags: map.flags,
        db: Number(map.db),
        sub: Number(map.sub),
        psub: Number(map.psub),
        multi: Number(map.multi),
        qbuf: Number(map.qbuf),
        qbufFree: Number(map["qbuf-free"]),
        argvMem: Number(map["argv-mem"]),
        obl: Number(map.obl),
        oll: Number(map.oll),
        omem: Number(map.omem),
        totMem: Number(map["tot-mem"]),
        events: map.events,
        cmd: map.cmd,
        user: map.user
      };
      if (map.laddr !== void 0) {
        reply.laddr = map.laddr;
      }
      if (map.redir !== void 0) {
        reply.redir = Number(map.redir);
      }
      if (map.ssub !== void 0) {
        reply.ssub = Number(map.ssub);
      }
      if (map["multi-mem"] !== void 0) {
        reply.multiMem = Number(map["multi-mem"]);
      }
      if (map.resp !== void 0) {
        reply.resp = Number(map.resp);
      }
      return reply;
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLIENT_LIST.js
var require_CLIENT_LIST = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLIENT_LIST.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var generic_transformers_1 = require_generic_transformers();
    var CLIENT_INFO_1 = require_CLIENT_INFO();
    exports.IS_READ_ONLY = true;
    function transformArguments(filter) {
      let args = ["CLIENT", "LIST"];
      if (filter) {
        if (filter.TYPE !== void 0) {
          args.push("TYPE", filter.TYPE);
        } else {
          args.push("ID");
          args = (0, generic_transformers_1.pushVerdictArguments)(args, filter.ID);
        }
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(rawReply) {
      const split = rawReply.split("\n"), length = split.length - 1, reply = [];
      for (let i = 0; i < length; i++) {
        reply.push((0, CLIENT_INFO_1.transformReply)(split[i]));
      }
      return reply;
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLIENT_NO-EVICT.js
var require_CLIENT_NO_EVICT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLIENT_NO-EVICT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(value) {
      return [
        "CLIENT",
        "NO-EVICT",
        value ? "ON" : "OFF"
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLIENT_NO-TOUCH.js
var require_CLIENT_NO_TOUCH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLIENT_NO-TOUCH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(value) {
      return [
        "CLIENT",
        "NO-TOUCH",
        value ? "ON" : "OFF"
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLIENT_PAUSE.js
var require_CLIENT_PAUSE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLIENT_PAUSE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(timeout, mode) {
      const args = [
        "CLIENT",
        "PAUSE",
        timeout.toString()
      ];
      if (mode) {
        args.push(mode);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLIENT_SETNAME.js
var require_CLIENT_SETNAME = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLIENT_SETNAME.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(name) {
      return ["CLIENT", "SETNAME", name];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLIENT_TRACKING.js
var require_CLIENT_TRACKING = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLIENT_TRACKING.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(mode, options) {
      const args = [
        "CLIENT",
        "TRACKING",
        mode ? "ON" : "OFF"
      ];
      if (mode) {
        if (options?.REDIRECT) {
          args.push("REDIRECT", options.REDIRECT.toString());
        }
        if (isBroadcast(options)) {
          args.push("BCAST");
          if (options?.PREFIX) {
            if (Array.isArray(options.PREFIX)) {
              for (const prefix of options.PREFIX) {
                args.push("PREFIX", prefix);
              }
            } else {
              args.push("PREFIX", options.PREFIX);
            }
          }
        } else if (isOptIn(options)) {
          args.push("OPTIN");
        } else if (isOptOut(options)) {
          args.push("OPTOUT");
        }
        if (options?.NOLOOP) {
          args.push("NOLOOP");
        }
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function isBroadcast(options) {
      return options?.BCAST === true;
    }
    function isOptIn(options) {
      return options?.OPTIN === true;
    }
    function isOptOut(options) {
      return options?.OPTOUT === true;
    }
  }
});

// node_modules/@redis/client/dist/lib/commands/CLIENT_TRACKINGINFO.js
var require_CLIENT_TRACKINGINFO = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLIENT_TRACKINGINFO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = void 0;
    function transformArguments() {
      return ["CLIENT", "TRACKINGINFO"];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return {
        flags: new Set(reply[1]),
        redirect: reply[3],
        prefixes: reply[5]
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLIENT_UNPAUSE.js
var require_CLIENT_UNPAUSE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLIENT_UNPAUSE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["CLIENT", "UNPAUSE"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_ADDSLOTS.js
var require_CLUSTER_ADDSLOTS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_ADDSLOTS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    var generic_transformers_1 = require_generic_transformers();
    function transformArguments(slots) {
      return (0, generic_transformers_1.pushVerdictNumberArguments)(["CLUSTER", "ADDSLOTS"], slots);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_ADDSLOTSRANGE.js
var require_CLUSTER_ADDSLOTSRANGE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_ADDSLOTSRANGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    var generic_transformers_1 = require_generic_transformers();
    function transformArguments(ranges) {
      return (0, generic_transformers_1.pushSlotRangesArguments)(["CLUSTER", "ADDSLOTSRANGE"], ranges);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_BUMPEPOCH.js
var require_CLUSTER_BUMPEPOCH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_BUMPEPOCH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["CLUSTER", "BUMPEPOCH"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_COUNT-FAILURE-REPORTS.js
var require_CLUSTER_COUNT_FAILURE_REPORTS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_COUNT-FAILURE-REPORTS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(nodeId) {
      return ["CLUSTER", "COUNT-FAILURE-REPORTS", nodeId];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_COUNTKEYSINSLOT.js
var require_CLUSTER_COUNTKEYSINSLOT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_COUNTKEYSINSLOT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(slot) {
      return ["CLUSTER", "COUNTKEYSINSLOT", slot.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_DELSLOTS.js
var require_CLUSTER_DELSLOTS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_DELSLOTS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    var generic_transformers_1 = require_generic_transformers();
    function transformArguments(slots) {
      return (0, generic_transformers_1.pushVerdictNumberArguments)(["CLUSTER", "DELSLOTS"], slots);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_DELSLOTSRANGE.js
var require_CLUSTER_DELSLOTSRANGE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_DELSLOTSRANGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    var generic_transformers_1 = require_generic_transformers();
    function transformArguments(ranges) {
      return (0, generic_transformers_1.pushSlotRangesArguments)(["CLUSTER", "DELSLOTSRANGE"], ranges);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_FAILOVER.js
var require_CLUSTER_FAILOVER = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_FAILOVER.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FailoverModes = void 0;
    var FailoverModes;
    (function(FailoverModes2) {
      FailoverModes2["FORCE"] = "FORCE";
      FailoverModes2["TAKEOVER"] = "TAKEOVER";
    })(FailoverModes || (exports.FailoverModes = FailoverModes = {}));
    function transformArguments(mode) {
      const args = ["CLUSTER", "FAILOVER"];
      if (mode) {
        args.push(mode);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_FLUSHSLOTS.js
var require_CLUSTER_FLUSHSLOTS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_FLUSHSLOTS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["CLUSTER", "FLUSHSLOTS"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_FORGET.js
var require_CLUSTER_FORGET = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_FORGET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(nodeId) {
      return ["CLUSTER", "FORGET", nodeId];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_GETKEYSINSLOT.js
var require_CLUSTER_GETKEYSINSLOT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_GETKEYSINSLOT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(slot, count) {
      return ["CLUSTER", "GETKEYSINSLOT", slot.toString(), count.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_INFO.js
var require_CLUSTER_INFO = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_INFO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.extractLineValue = exports.transformReply = exports.transformArguments = void 0;
    function transformArguments() {
      return ["CLUSTER", "INFO"];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      const lines = reply.split("\r\n");
      return {
        state: extractLineValue(lines[0]),
        slots: {
          assigned: Number(extractLineValue(lines[1])),
          ok: Number(extractLineValue(lines[2])),
          pfail: Number(extractLineValue(lines[3])),
          fail: Number(extractLineValue(lines[4]))
        },
        knownNodes: Number(extractLineValue(lines[5])),
        size: Number(extractLineValue(lines[6])),
        currentEpoch: Number(extractLineValue(lines[7])),
        myEpoch: Number(extractLineValue(lines[8])),
        stats: {
          messagesSent: Number(extractLineValue(lines[9])),
          messagesReceived: Number(extractLineValue(lines[10]))
        }
      };
    }
    exports.transformReply = transformReply;
    function extractLineValue(line) {
      return line.substring(line.indexOf(":") + 1);
    }
    exports.extractLineValue = extractLineValue;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_KEYSLOT.js
var require_CLUSTER_KEYSLOT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_KEYSLOT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(key) {
      return ["CLUSTER", "KEYSLOT", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_LINKS.js
var require_CLUSTER_LINKS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_LINKS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = void 0;
    function transformArguments() {
      return ["CLUSTER", "LINKS"];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return reply.map((peerLink) => ({
        direction: peerLink[1],
        node: peerLink[3],
        createTime: Number(peerLink[5]),
        events: peerLink[7],
        sendBufferAllocated: Number(peerLink[9]),
        sendBufferUsed: Number(peerLink[11])
      }));
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_MEET.js
var require_CLUSTER_MEET = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_MEET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(ip, port) {
      return ["CLUSTER", "MEET", ip, port.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_MYID.js
var require_CLUSTER_MYID = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_MYID.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["CLUSTER", "MYID"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_MYSHARDID.js
var require_CLUSTER_MYSHARDID = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_MYSHARDID.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments() {
      return ["CLUSTER", "MYSHARDID"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_NODES.js
var require_CLUSTER_NODES = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_NODES.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.RedisClusterNodeLinkStates = exports.transformArguments = void 0;
    function transformArguments() {
      return ["CLUSTER", "NODES"];
    }
    exports.transformArguments = transformArguments;
    var RedisClusterNodeLinkStates;
    (function(RedisClusterNodeLinkStates2) {
      RedisClusterNodeLinkStates2["CONNECTED"] = "connected";
      RedisClusterNodeLinkStates2["DISCONNECTED"] = "disconnected";
    })(RedisClusterNodeLinkStates || (exports.RedisClusterNodeLinkStates = RedisClusterNodeLinkStates = {}));
    function transformReply(reply) {
      const lines = reply.split("\n");
      lines.pop();
      const mastersMap = /* @__PURE__ */ new Map(), replicasMap = /* @__PURE__ */ new Map();
      for (const line of lines) {
        const [id, address, flags, masterId, pingSent, pongRecv, configEpoch, linkState, ...slots] = line.split(" "), node = {
          id,
          address,
          ...transformNodeAddress(address),
          flags: flags.split(","),
          pingSent: Number(pingSent),
          pongRecv: Number(pongRecv),
          configEpoch: Number(configEpoch),
          linkState
        };
        if (masterId === "-") {
          let replicas = replicasMap.get(id);
          if (!replicas) {
            replicas = [];
            replicasMap.set(id, replicas);
          }
          mastersMap.set(id, {
            ...node,
            slots: slots.map((slot) => {
              const [fromString, toString] = slot.split("-", 2), from = Number(fromString);
              return {
                from,
                to: toString ? Number(toString) : from
              };
            }),
            replicas
          });
        } else {
          const replicas = replicasMap.get(masterId);
          if (!replicas) {
            replicasMap.set(masterId, [node]);
          } else {
            replicas.push(node);
          }
        }
      }
      return [...mastersMap.values()];
    }
    exports.transformReply = transformReply;
    function transformNodeAddress(address) {
      const indexOfColon = address.lastIndexOf(":"), indexOfAt = address.indexOf("@", indexOfColon), host = address.substring(0, indexOfColon);
      if (indexOfAt === -1) {
        return {
          host,
          port: Number(address.substring(indexOfColon + 1)),
          cport: null
        };
      }
      return {
        host: address.substring(0, indexOfColon),
        port: Number(address.substring(indexOfColon + 1, indexOfAt)),
        cport: Number(address.substring(indexOfAt + 1))
      };
    }
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_REPLICAS.js
var require_CLUSTER_REPLICAS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_REPLICAS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = void 0;
    function transformArguments(nodeId) {
      return ["CLUSTER", "REPLICAS", nodeId];
    }
    exports.transformArguments = transformArguments;
    var CLUSTER_NODES_1 = require_CLUSTER_NODES();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return CLUSTER_NODES_1.transformReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_REPLICATE.js
var require_CLUSTER_REPLICATE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_REPLICATE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(nodeId) {
      return ["CLUSTER", "REPLICATE", nodeId];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_RESET.js
var require_CLUSTER_RESET = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_RESET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(mode) {
      const args = ["CLUSTER", "RESET"];
      if (mode) {
        args.push(mode);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_SAVECONFIG.js
var require_CLUSTER_SAVECONFIG = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_SAVECONFIG.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["CLUSTER", "SAVECONFIG"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_SET-CONFIG-EPOCH.js
var require_CLUSTER_SET_CONFIG_EPOCH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_SET-CONFIG-EPOCH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(configEpoch) {
      return ["CLUSTER", "SET-CONFIG-EPOCH", configEpoch.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_SETSLOT.js
var require_CLUSTER_SETSLOT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_SETSLOT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.ClusterSlotStates = void 0;
    var ClusterSlotStates;
    (function(ClusterSlotStates2) {
      ClusterSlotStates2["IMPORTING"] = "IMPORTING";
      ClusterSlotStates2["MIGRATING"] = "MIGRATING";
      ClusterSlotStates2["STABLE"] = "STABLE";
      ClusterSlotStates2["NODE"] = "NODE";
    })(ClusterSlotStates || (exports.ClusterSlotStates = ClusterSlotStates = {}));
    function transformArguments(slot, state, nodeId) {
      const args = ["CLUSTER", "SETSLOT", slot.toString(), state];
      if (nodeId) {
        args.push(nodeId);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CLUSTER_SLOTS.js
var require_CLUSTER_SLOTS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CLUSTER_SLOTS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = void 0;
    function transformArguments() {
      return ["CLUSTER", "SLOTS"];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return reply.map(([from, to, master, ...replicas]) => {
        return {
          from,
          to,
          master: transformNode(master),
          replicas: replicas.map(transformNode)
        };
      });
    }
    exports.transformReply = transformReply;
    function transformNode([ip, port, id]) {
      return {
        ip,
        port,
        id
      };
    }
  }
});

// node_modules/@redis/client/dist/lib/commands/COMMAND_COUNT.js
var require_COMMAND_COUNT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/COMMAND_COUNT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments() {
      return ["COMMAND", "COUNT"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/COMMAND_GETKEYS.js
var require_COMMAND_GETKEYS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/COMMAND_GETKEYS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments(args) {
      return ["COMMAND", "GETKEYS", ...args];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/COMMAND_GETKEYSANDFLAGS.js
var require_COMMAND_GETKEYSANDFLAGS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/COMMAND_GETKEYSANDFLAGS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments(args) {
      return ["COMMAND", "GETKEYSANDFLAGS", ...args];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return reply.map(([key, flags]) => ({
        key,
        flags
      }));
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/COMMAND_INFO.js
var require_COMMAND_INFO = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/COMMAND_INFO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.IS_READ_ONLY = true;
    function transformArguments(commands) {
      return ["COMMAND", "INFO", ...commands];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return reply.map((command) => command ? (0, generic_transformers_1.transformCommandReply)(command) : null);
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/COMMAND_LIST.js
var require_COMMAND_LIST = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/COMMAND_LIST.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FilterBy = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    var FilterBy;
    (function(FilterBy2) {
      FilterBy2["MODULE"] = "MODULE";
      FilterBy2["ACLCAT"] = "ACLCAT";
      FilterBy2["PATTERN"] = "PATTERN";
    })(FilterBy || (exports.FilterBy = FilterBy = {}));
    function transformArguments(filter) {
      const args = ["COMMAND", "LIST"];
      if (filter) {
        args.push("FILTERBY", filter.filterBy, filter.value);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/COMMAND.js
var require_COMMAND = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/COMMAND.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.IS_READ_ONLY = true;
    function transformArguments() {
      return ["COMMAND"];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return reply.map(generic_transformers_1.transformCommandReply);
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/CONFIG_GET.js
var require_CONFIG_GET = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CONFIG_GET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = void 0;
    function transformArguments(parameter) {
      return ["CONFIG", "GET", parameter];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformTuplesReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/CONFIG_RESETSTAT.js
var require_CONFIG_RESETSTAT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CONFIG_RESETSTAT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["CONFIG", "RESETSTAT"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CONFIG_REWRITE.js
var require_CONFIG_REWRITE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CONFIG_REWRITE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["CONFIG", "REWRITE"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/CONFIG_SET.js
var require_CONFIG_SET = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/CONFIG_SET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(...[parameterOrConfig, value]) {
      const args = ["CONFIG", "SET"];
      if (typeof parameterOrConfig === "string") {
        args.push(parameterOrConfig, value);
      } else {
        for (const [key, value2] of Object.entries(parameterOrConfig)) {
          args.push(key, value2);
        }
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/DBSIZE.js
var require_DBSIZE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/DBSIZE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments() {
      return ["DBSIZE"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/DISCARD.js
var require_DISCARD = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/DISCARD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["DISCARD"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ECHO.js
var require_ECHO = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ECHO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments(message) {
      return ["ECHO", message];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/FAILOVER.js
var require_FAILOVER = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/FAILOVER.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(options) {
      const args = ["FAILOVER"];
      if (options?.TO) {
        args.push("TO", options.TO.host, options.TO.port.toString());
        if (options.TO.FORCE) {
          args.push("FORCE");
        }
      }
      if (options?.ABORT) {
        args.push("ABORT");
      }
      if (options?.TIMEOUT) {
        args.push("TIMEOUT", options.TIMEOUT.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/FLUSHALL.js
var require_FLUSHALL = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/FLUSHALL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.RedisFlushModes = void 0;
    var RedisFlushModes;
    (function(RedisFlushModes2) {
      RedisFlushModes2["ASYNC"] = "ASYNC";
      RedisFlushModes2["SYNC"] = "SYNC";
    })(RedisFlushModes || (exports.RedisFlushModes = RedisFlushModes = {}));
    function transformArguments(mode) {
      const args = ["FLUSHALL"];
      if (mode) {
        args.push(mode);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/FLUSHDB.js
var require_FLUSHDB = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/FLUSHDB.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(mode) {
      const args = ["FLUSHDB"];
      if (mode) {
        args.push(mode);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/FUNCTION_DELETE.js
var require_FUNCTION_DELETE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/FUNCTION_DELETE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(library) {
      return ["FUNCTION", "DELETE", library];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/FUNCTION_DUMP.js
var require_FUNCTION_DUMP = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/FUNCTION_DUMP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["FUNCTION", "DUMP"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/FUNCTION_FLUSH.js
var require_FUNCTION_FLUSH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/FUNCTION_FLUSH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(mode) {
      const args = ["FUNCTION", "FLUSH"];
      if (mode) {
        args.push(mode);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/FUNCTION_KILL.js
var require_FUNCTION_KILL = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/FUNCTION_KILL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["FUNCTION", "KILL"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/FUNCTION_LIST.js
var require_FUNCTION_LIST = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/FUNCTION_LIST.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = void 0;
    var generic_transformers_1 = require_generic_transformers();
    function transformArguments(pattern) {
      const args = ["FUNCTION", "LIST"];
      if (pattern) {
        args.push(pattern);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return reply.map(generic_transformers_1.transformFunctionListItemReply);
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/FUNCTION_LIST_WITHCODE.js
var require_FUNCTION_LIST_WITHCODE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/FUNCTION_LIST_WITHCODE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = void 0;
    var FUNCTION_LIST_1 = require_FUNCTION_LIST();
    var generic_transformers_1 = require_generic_transformers();
    function transformArguments(pattern) {
      const args = (0, FUNCTION_LIST_1.transformArguments)(pattern);
      args.push("WITHCODE");
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return reply.map((library) => ({
        ...(0, generic_transformers_1.transformFunctionListItemReply)(library),
        libraryCode: library[7]
      }));
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/FUNCTION_LOAD.js
var require_FUNCTION_LOAD = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/FUNCTION_LOAD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(code, options) {
      const args = ["FUNCTION", "LOAD"];
      if (options?.REPLACE) {
        args.push("REPLACE");
      }
      args.push(code);
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/FUNCTION_RESTORE.js
var require_FUNCTION_RESTORE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/FUNCTION_RESTORE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(dump, mode) {
      const args = ["FUNCTION", "RESTORE", dump];
      if (mode) {
        args.push(mode);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/FUNCTION_STATS.js
var require_FUNCTION_STATS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/FUNCTION_STATS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = void 0;
    function transformArguments() {
      return ["FUNCTION", "STATS"];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      const engines = /* @__PURE__ */ Object.create(null);
      for (let i = 0; i < reply[3].length; i++) {
        engines[reply[3][i]] = {
          librariesCount: reply[3][++i][1],
          functionsCount: reply[3][i][3]
        };
      }
      return {
        runningScript: reply[1] === null ? null : {
          name: reply[1][1],
          command: reply[1][3],
          durationMs: reply[1][5]
        },
        engines
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/HELLO.js
var require_HELLO = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/HELLO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = void 0;
    function transformArguments(options) {
      const args = ["HELLO"];
      if (options) {
        args.push(options.protover.toString());
        if (options.auth) {
          args.push("AUTH", options.auth.username, options.auth.password);
        }
        if (options.clientName) {
          args.push("SETNAME", options.clientName);
        }
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return {
        server: reply[1],
        version: reply[3],
        proto: reply[5],
        id: reply[7],
        mode: reply[9],
        role: reply[11],
        modules: reply[13]
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/INFO.js
var require_INFO = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/INFO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments(section) {
      const args = ["INFO"];
      if (section) {
        args.push(section);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/KEYS.js
var require_KEYS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/KEYS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(pattern) {
      return ["KEYS", pattern];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LASTSAVE.js
var require_LASTSAVE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LASTSAVE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments() {
      return ["LASTSAVE"];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return new Date(reply);
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/LATENCY_DOCTOR.js
var require_LATENCY_DOCTOR = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LATENCY_DOCTOR.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["LATENCY", "DOCTOR"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LATENCY_GRAPH.js
var require_LATENCY_GRAPH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LATENCY_GRAPH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(event) {
      return ["LATENCY", "GRAPH", event];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LATENCY_HISTORY.js
var require_LATENCY_HISTORY = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LATENCY_HISTORY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(event) {
      return ["LATENCY", "HISTORY", event];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LATENCY_LATEST.js
var require_LATENCY_LATEST = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LATENCY_LATEST.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["LATENCY", "LATEST"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/LOLWUT.js
var require_LOLWUT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/LOLWUT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments(version, ...optionalArguments) {
      const args = ["LOLWUT"];
      if (version) {
        args.push("VERSION", version.toString(), ...optionalArguments.map(String));
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/MEMORY_DOCTOR.js
var require_MEMORY_DOCTOR = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/MEMORY_DOCTOR.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["MEMORY", "DOCTOR"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/MEMORY_MALLOC-STATS.js
var require_MEMORY_MALLOC_STATS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/MEMORY_MALLOC-STATS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["MEMORY", "MALLOC-STATS"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/MEMORY_PURGE.js
var require_MEMORY_PURGE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/MEMORY_PURGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["MEMORY", "PURGE"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/MEMORY_STATS.js
var require_MEMORY_STATS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/MEMORY_STATS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = void 0;
    function transformArguments() {
      return ["MEMORY", "STATS"];
    }
    exports.transformArguments = transformArguments;
    var FIELDS_MAPPING = {
      "peak.allocated": "peakAllocated",
      "total.allocated": "totalAllocated",
      "startup.allocated": "startupAllocated",
      "replication.backlog": "replicationBacklog",
      "clients.slaves": "clientsReplicas",
      "clients.normal": "clientsNormal",
      "aof.buffer": "aofBuffer",
      "lua.caches": "luaCaches",
      "overhead.total": "overheadTotal",
      "keys.count": "keysCount",
      "keys.bytes-per-key": "keysBytesPerKey",
      "dataset.bytes": "datasetBytes",
      "dataset.percentage": "datasetPercentage",
      "peak.percentage": "peakPercentage",
      "allocator.allocated": "allocatorAllocated",
      "allocator.active": "allocatorActive",
      "allocator.resident": "allocatorResident",
      "allocator-fragmentation.ratio": "allocatorFragmentationRatio",
      "allocator-fragmentation.bytes": "allocatorFragmentationBytes",
      "allocator-rss.ratio": "allocatorRssRatio",
      "allocator-rss.bytes": "allocatorRssBytes",
      "rss-overhead.ratio": "rssOverheadRatio",
      "rss-overhead.bytes": "rssOverheadBytes",
      "fragmentation": "fragmentation",
      "fragmentation.bytes": "fragmentationBytes"
    };
    var DB_FIELDS_MAPPING = {
      "overhead.hashtable.main": "overheadHashtableMain",
      "overhead.hashtable.expires": "overheadHashtableExpires"
    };
    function transformReply(rawReply) {
      const reply = {
        db: {}
      };
      for (let i = 0; i < rawReply.length; i += 2) {
        const key = rawReply[i];
        if (key.startsWith("db.")) {
          const dbTuples = rawReply[i + 1], db = {};
          for (let j = 0; j < dbTuples.length; j += 2) {
            db[DB_FIELDS_MAPPING[dbTuples[j]]] = dbTuples[j + 1];
          }
          reply.db[key.substring(3)] = db;
          continue;
        }
        reply[FIELDS_MAPPING[key]] = Number(rawReply[i + 1]);
      }
      return reply;
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/MEMORY_USAGE.js
var require_MEMORY_USAGE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/MEMORY_USAGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, options) {
      const args = ["MEMORY", "USAGE", key];
      if (options?.SAMPLES) {
        args.push("SAMPLES", options.SAMPLES.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/MODULE_LIST.js
var require_MODULE_LIST = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/MODULE_LIST.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["MODULE", "LIST"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/MODULE_LOAD.js
var require_MODULE_LOAD = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/MODULE_LOAD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(path, moduleArgs) {
      const args = ["MODULE", "LOAD", path];
      if (moduleArgs) {
        args.push(...moduleArgs);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/MODULE_UNLOAD.js
var require_MODULE_UNLOAD = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/MODULE_UNLOAD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(name) {
      return ["MODULE", "UNLOAD", name];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/MOVE.js
var require_MOVE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/MOVE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, db) {
      return ["MOVE", key, db.toString()];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/PING.js
var require_PING = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/PING.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(message) {
      const args = ["PING"];
      if (message) {
        args.push(message);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/PUBSUB_CHANNELS.js
var require_PUBSUB_CHANNELS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/PUBSUB_CHANNELS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments(pattern) {
      const args = ["PUBSUB", "CHANNELS"];
      if (pattern) {
        args.push(pattern);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/PUBSUB_NUMPAT.js
var require_PUBSUB_NUMPAT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/PUBSUB_NUMPAT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments() {
      return ["PUBSUB", "NUMPAT"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/PUBSUB_NUMSUB.js
var require_PUBSUB_NUMSUB = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/PUBSUB_NUMSUB.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.IS_READ_ONLY = true;
    function transformArguments(channels) {
      const args = ["PUBSUB", "NUMSUB"];
      if (channels)
        return (0, generic_transformers_1.pushVerdictArguments)(args, channels);
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(rawReply) {
      const transformedReply = /* @__PURE__ */ Object.create(null);
      for (let i = 0; i < rawReply.length; i += 2) {
        transformedReply[rawReply[i]] = rawReply[i + 1];
      }
      return transformedReply;
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/PUBSUB_SHARDCHANNELS.js
var require_PUBSUB_SHARDCHANNELS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/PUBSUB_SHARDCHANNELS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments(pattern) {
      const args = ["PUBSUB", "SHARDCHANNELS"];
      if (pattern)
        args.push(pattern);
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/PUBSUB_SHARDNUMSUB.js
var require_PUBSUB_SHARDNUMSUB = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/PUBSUB_SHARDNUMSUB.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.IS_READ_ONLY = true;
    function transformArguments(channels) {
      const args = ["PUBSUB", "SHARDNUMSUB"];
      if (channels)
        return (0, generic_transformers_1.pushVerdictArguments)(args, channels);
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(rawReply) {
      const transformedReply = /* @__PURE__ */ Object.create(null);
      for (let i = 0; i < rawReply.length; i += 2) {
        transformedReply[rawReply[i]] = rawReply[i + 1];
      }
      return transformedReply;
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/RANDOMKEY.js
var require_RANDOMKEY = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/RANDOMKEY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments() {
      return ["RANDOMKEY"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/READONLY.js
var require_READONLY = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/READONLY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["READONLY"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/READWRITE.js
var require_READWRITE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/READWRITE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["READWRITE"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/REPLICAOF.js
var require_REPLICAOF = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/REPLICAOF.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(host, port) {
      return ["REPLICAOF", host, port.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/RESTORE-ASKING.js
var require_RESTORE_ASKING = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/RESTORE-ASKING.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["RESTORE-ASKING"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/ROLE.js
var require_ROLE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/ROLE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments() {
      return ["ROLE"];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      switch (reply[0]) {
        case "master":
          return {
            role: "master",
            replicationOffest: reply[1],
            replicas: reply[2].map(([ip, port, replicationOffest]) => ({
              ip,
              port: Number(port),
              replicationOffest: Number(replicationOffest)
            }))
          };
        case "slave":
          return {
            role: "slave",
            master: {
              ip: reply[1],
              port: reply[2]
            },
            state: reply[3],
            dataReceived: reply[4]
          };
        case "sentinel":
          return {
            role: "sentinel",
            masterNames: reply[1]
          };
      }
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/SAVE.js
var require_SAVE = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SAVE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["SAVE"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SCAN.js
var require_SCAN = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SCAN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.IS_READ_ONLY = true;
    function transformArguments(cursor, options) {
      const args = (0, generic_transformers_1.pushScanArguments)(["SCAN"], cursor, options);
      if (options?.TYPE) {
        args.push("TYPE", options.TYPE);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply([cursor, keys]) {
      return {
        cursor: Number(cursor),
        keys
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/SCRIPT_DEBUG.js
var require_SCRIPT_DEBUG = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SCRIPT_DEBUG.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(mode) {
      return ["SCRIPT", "DEBUG", mode];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SCRIPT_EXISTS.js
var require_SCRIPT_EXISTS = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SCRIPT_EXISTS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = void 0;
    var generic_transformers_1 = require_generic_transformers();
    function transformArguments(sha1) {
      return (0, generic_transformers_1.pushVerdictArguments)(["SCRIPT", "EXISTS"], sha1);
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_2 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_2.transformBooleanArrayReply;
    } });
  }
});

// node_modules/@redis/client/dist/lib/commands/SCRIPT_FLUSH.js
var require_SCRIPT_FLUSH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SCRIPT_FLUSH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(mode) {
      const args = ["SCRIPT", "FLUSH"];
      if (mode) {
        args.push(mode);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SCRIPT_KILL.js
var require_SCRIPT_KILL = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SCRIPT_KILL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["SCRIPT", "KILL"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SCRIPT_LOAD.js
var require_SCRIPT_LOAD = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SCRIPT_LOAD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(script) {
      return ["SCRIPT", "LOAD", script];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SHUTDOWN.js
var require_SHUTDOWN = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SHUTDOWN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(mode) {
      const args = ["SHUTDOWN"];
      if (mode) {
        args.push(mode);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/SWAPDB.js
var require_SWAPDB = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/SWAPDB.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(index1, index2) {
      return ["SWAPDB", index1.toString(), index2.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/TIME.js
var require_TIME = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/TIME.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = void 0;
    function transformArguments() {
      return ["TIME"];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      const seconds = Number(reply[0]), microseconds = Number(reply[1]), d = new Date(seconds * 1e3 + microseconds / 1e3);
      d.microseconds = microseconds;
      return d;
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/client/dist/lib/commands/UNWATCH.js
var require_UNWATCH = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/UNWATCH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["UNWATCH"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/commands/WAIT.js
var require_WAIT = __commonJS({
  "node_modules/@redis/client/dist/lib/commands/WAIT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(numberOfReplicas, timeout) {
      return ["WAIT", numberOfReplicas.toString(), timeout.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/client/dist/lib/client/commands.js
var require_commands2 = __commonJS({
  "node_modules/@redis/client/dist/lib/client/commands.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var commands_1 = require_commands();
    var ACL_CAT = require_ACL_CAT();
    var ACL_DELUSER = require_ACL_DELUSER();
    var ACL_DRYRUN = require_ACL_DRYRUN();
    var ACL_GENPASS = require_ACL_GENPASS();
    var ACL_GETUSER = require_ACL_GETUSER();
    var ACL_LIST = require_ACL_LIST();
    var ACL_LOAD = require_ACL_LOAD();
    var ACL_LOG_RESET = require_ACL_LOG_RESET();
    var ACL_LOG = require_ACL_LOG();
    var ACL_SAVE = require_ACL_SAVE();
    var ACL_SETUSER = require_ACL_SETUSER();
    var ACL_USERS = require_ACL_USERS();
    var ACL_WHOAMI = require_ACL_WHOAMI();
    var ASKING = require_ASKING();
    var AUTH = require_AUTH();
    var BGREWRITEAOF = require_BGREWRITEAOF();
    var BGSAVE = require_BGSAVE();
    var CLIENT_CACHING = require_CLIENT_CACHING();
    var CLIENT_GETNAME = require_CLIENT_GETNAME();
    var CLIENT_GETREDIR = require_CLIENT_GETREDIR();
    var CLIENT_ID = require_CLIENT_ID();
    var CLIENT_KILL = require_CLIENT_KILL();
    var CLIENT_LIST = require_CLIENT_LIST();
    var CLIENT_NO_EVICT = require_CLIENT_NO_EVICT();
    var CLIENT_NO_TOUCH = require_CLIENT_NO_TOUCH();
    var CLIENT_PAUSE = require_CLIENT_PAUSE();
    var CLIENT_SETNAME = require_CLIENT_SETNAME();
    var CLIENT_TRACKING = require_CLIENT_TRACKING();
    var CLIENT_TRACKINGINFO = require_CLIENT_TRACKINGINFO();
    var CLIENT_UNPAUSE = require_CLIENT_UNPAUSE();
    var CLIENT_INFO = require_CLIENT_INFO();
    var CLUSTER_ADDSLOTS = require_CLUSTER_ADDSLOTS();
    var CLUSTER_ADDSLOTSRANGE = require_CLUSTER_ADDSLOTSRANGE();
    var CLUSTER_BUMPEPOCH = require_CLUSTER_BUMPEPOCH();
    var CLUSTER_COUNT_FAILURE_REPORTS = require_CLUSTER_COUNT_FAILURE_REPORTS();
    var CLUSTER_COUNTKEYSINSLOT = require_CLUSTER_COUNTKEYSINSLOT();
    var CLUSTER_DELSLOTS = require_CLUSTER_DELSLOTS();
    var CLUSTER_DELSLOTSRANGE = require_CLUSTER_DELSLOTSRANGE();
    var CLUSTER_FAILOVER = require_CLUSTER_FAILOVER();
    var CLUSTER_FLUSHSLOTS = require_CLUSTER_FLUSHSLOTS();
    var CLUSTER_FORGET = require_CLUSTER_FORGET();
    var CLUSTER_GETKEYSINSLOT = require_CLUSTER_GETKEYSINSLOT();
    var CLUSTER_INFO = require_CLUSTER_INFO();
    var CLUSTER_KEYSLOT = require_CLUSTER_KEYSLOT();
    var CLUSTER_LINKS = require_CLUSTER_LINKS();
    var CLUSTER_MEET = require_CLUSTER_MEET();
    var CLUSTER_MYID = require_CLUSTER_MYID();
    var CLUSTER_MYSHARDID = require_CLUSTER_MYSHARDID();
    var CLUSTER_NODES = require_CLUSTER_NODES();
    var CLUSTER_REPLICAS = require_CLUSTER_REPLICAS();
    var CLUSTER_REPLICATE = require_CLUSTER_REPLICATE();
    var CLUSTER_RESET = require_CLUSTER_RESET();
    var CLUSTER_SAVECONFIG = require_CLUSTER_SAVECONFIG();
    var CLUSTER_SET_CONFIG_EPOCH = require_CLUSTER_SET_CONFIG_EPOCH();
    var CLUSTER_SETSLOT = require_CLUSTER_SETSLOT();
    var CLUSTER_SLOTS = require_CLUSTER_SLOTS();
    var COMMAND_COUNT = require_COMMAND_COUNT();
    var COMMAND_GETKEYS = require_COMMAND_GETKEYS();
    var COMMAND_GETKEYSANDFLAGS = require_COMMAND_GETKEYSANDFLAGS();
    var COMMAND_INFO = require_COMMAND_INFO();
    var COMMAND_LIST = require_COMMAND_LIST();
    var COMMAND = require_COMMAND();
    var CONFIG_GET = require_CONFIG_GET();
    var CONFIG_RESETASTAT = require_CONFIG_RESETSTAT();
    var CONFIG_REWRITE = require_CONFIG_REWRITE();
    var CONFIG_SET = require_CONFIG_SET();
    var DBSIZE = require_DBSIZE();
    var DISCARD = require_DISCARD();
    var ECHO = require_ECHO();
    var FAILOVER = require_FAILOVER();
    var FLUSHALL = require_FLUSHALL();
    var FLUSHDB = require_FLUSHDB();
    var FUNCTION_DELETE = require_FUNCTION_DELETE();
    var FUNCTION_DUMP = require_FUNCTION_DUMP();
    var FUNCTION_FLUSH = require_FUNCTION_FLUSH();
    var FUNCTION_KILL = require_FUNCTION_KILL();
    var FUNCTION_LIST_WITHCODE = require_FUNCTION_LIST_WITHCODE();
    var FUNCTION_LIST = require_FUNCTION_LIST();
    var FUNCTION_LOAD = require_FUNCTION_LOAD();
    var FUNCTION_RESTORE = require_FUNCTION_RESTORE();
    var FUNCTION_STATS = require_FUNCTION_STATS();
    var HELLO = require_HELLO();
    var INFO = require_INFO();
    var KEYS = require_KEYS();
    var LASTSAVE = require_LASTSAVE();
    var LATENCY_DOCTOR = require_LATENCY_DOCTOR();
    var LATENCY_GRAPH = require_LATENCY_GRAPH();
    var LATENCY_HISTORY = require_LATENCY_HISTORY();
    var LATENCY_LATEST = require_LATENCY_LATEST();
    var LOLWUT = require_LOLWUT();
    var MEMORY_DOCTOR = require_MEMORY_DOCTOR();
    var MEMORY_MALLOC_STATS = require_MEMORY_MALLOC_STATS();
    var MEMORY_PURGE = require_MEMORY_PURGE();
    var MEMORY_STATS = require_MEMORY_STATS();
    var MEMORY_USAGE = require_MEMORY_USAGE();
    var MODULE_LIST = require_MODULE_LIST();
    var MODULE_LOAD = require_MODULE_LOAD();
    var MODULE_UNLOAD = require_MODULE_UNLOAD();
    var MOVE = require_MOVE();
    var PING = require_PING();
    var PUBSUB_CHANNELS = require_PUBSUB_CHANNELS();
    var PUBSUB_NUMPAT = require_PUBSUB_NUMPAT();
    var PUBSUB_NUMSUB = require_PUBSUB_NUMSUB();
    var PUBSUB_SHARDCHANNELS = require_PUBSUB_SHARDCHANNELS();
    var PUBSUB_SHARDNUMSUB = require_PUBSUB_SHARDNUMSUB();
    var RANDOMKEY = require_RANDOMKEY();
    var READONLY = require_READONLY();
    var READWRITE = require_READWRITE();
    var REPLICAOF = require_REPLICAOF();
    var RESTORE_ASKING = require_RESTORE_ASKING();
    var ROLE = require_ROLE();
    var SAVE = require_SAVE();
    var SCAN = require_SCAN();
    var SCRIPT_DEBUG = require_SCRIPT_DEBUG();
    var SCRIPT_EXISTS = require_SCRIPT_EXISTS();
    var SCRIPT_FLUSH = require_SCRIPT_FLUSH();
    var SCRIPT_KILL = require_SCRIPT_KILL();
    var SCRIPT_LOAD = require_SCRIPT_LOAD();
    var SHUTDOWN = require_SHUTDOWN();
    var SWAPDB = require_SWAPDB();
    var TIME = require_TIME();
    var UNWATCH = require_UNWATCH();
    var WAIT = require_WAIT();
    exports.default = {
      ...commands_1.default,
      ACL_CAT,
      aclCat: ACL_CAT,
      ACL_DELUSER,
      aclDelUser: ACL_DELUSER,
      ACL_DRYRUN,
      aclDryRun: ACL_DRYRUN,
      ACL_GENPASS,
      aclGenPass: ACL_GENPASS,
      ACL_GETUSER,
      aclGetUser: ACL_GETUSER,
      ACL_LIST,
      aclList: ACL_LIST,
      ACL_LOAD,
      aclLoad: ACL_LOAD,
      ACL_LOG_RESET,
      aclLogReset: ACL_LOG_RESET,
      ACL_LOG,
      aclLog: ACL_LOG,
      ACL_SAVE,
      aclSave: ACL_SAVE,
      ACL_SETUSER,
      aclSetUser: ACL_SETUSER,
      ACL_USERS,
      aclUsers: ACL_USERS,
      ACL_WHOAMI,
      aclWhoAmI: ACL_WHOAMI,
      ASKING,
      asking: ASKING,
      AUTH,
      auth: AUTH,
      BGREWRITEAOF,
      bgRewriteAof: BGREWRITEAOF,
      BGSAVE,
      bgSave: BGSAVE,
      CLIENT_CACHING,
      clientCaching: CLIENT_CACHING,
      CLIENT_GETNAME,
      clientGetName: CLIENT_GETNAME,
      CLIENT_GETREDIR,
      clientGetRedir: CLIENT_GETREDIR,
      CLIENT_ID,
      clientId: CLIENT_ID,
      CLIENT_KILL,
      clientKill: CLIENT_KILL,
      "CLIENT_NO-EVICT": CLIENT_NO_EVICT,
      clientNoEvict: CLIENT_NO_EVICT,
      "CLIENT_NO-TOUCH": CLIENT_NO_TOUCH,
      clientNoTouch: CLIENT_NO_TOUCH,
      CLIENT_LIST,
      clientList: CLIENT_LIST,
      CLIENT_PAUSE,
      clientPause: CLIENT_PAUSE,
      CLIENT_SETNAME,
      clientSetName: CLIENT_SETNAME,
      CLIENT_TRACKING,
      clientTracking: CLIENT_TRACKING,
      CLIENT_TRACKINGINFO,
      clientTrackingInfo: CLIENT_TRACKINGINFO,
      CLIENT_UNPAUSE,
      clientUnpause: CLIENT_UNPAUSE,
      CLIENT_INFO,
      clientInfo: CLIENT_INFO,
      CLUSTER_ADDSLOTS,
      clusterAddSlots: CLUSTER_ADDSLOTS,
      CLUSTER_ADDSLOTSRANGE,
      clusterAddSlotsRange: CLUSTER_ADDSLOTSRANGE,
      CLUSTER_BUMPEPOCH,
      clusterBumpEpoch: CLUSTER_BUMPEPOCH,
      CLUSTER_COUNT_FAILURE_REPORTS,
      clusterCountFailureReports: CLUSTER_COUNT_FAILURE_REPORTS,
      CLUSTER_COUNTKEYSINSLOT,
      clusterCountKeysInSlot: CLUSTER_COUNTKEYSINSLOT,
      CLUSTER_DELSLOTS,
      clusterDelSlots: CLUSTER_DELSLOTS,
      CLUSTER_DELSLOTSRANGE,
      clusterDelSlotsRange: CLUSTER_DELSLOTSRANGE,
      CLUSTER_FAILOVER,
      clusterFailover: CLUSTER_FAILOVER,
      CLUSTER_FLUSHSLOTS,
      clusterFlushSlots: CLUSTER_FLUSHSLOTS,
      CLUSTER_FORGET,
      clusterForget: CLUSTER_FORGET,
      CLUSTER_GETKEYSINSLOT,
      clusterGetKeysInSlot: CLUSTER_GETKEYSINSLOT,
      CLUSTER_INFO,
      clusterInfo: CLUSTER_INFO,
      CLUSTER_KEYSLOT,
      clusterKeySlot: CLUSTER_KEYSLOT,
      CLUSTER_LINKS,
      clusterLinks: CLUSTER_LINKS,
      CLUSTER_MEET,
      clusterMeet: CLUSTER_MEET,
      CLUSTER_MYID,
      clusterMyId: CLUSTER_MYID,
      CLUSTER_MYSHARDID,
      clusterMyShardId: CLUSTER_MYSHARDID,
      CLUSTER_NODES,
      clusterNodes: CLUSTER_NODES,
      CLUSTER_REPLICAS,
      clusterReplicas: CLUSTER_REPLICAS,
      CLUSTER_REPLICATE,
      clusterReplicate: CLUSTER_REPLICATE,
      CLUSTER_RESET,
      clusterReset: CLUSTER_RESET,
      CLUSTER_SAVECONFIG,
      clusterSaveConfig: CLUSTER_SAVECONFIG,
      CLUSTER_SET_CONFIG_EPOCH,
      clusterSetConfigEpoch: CLUSTER_SET_CONFIG_EPOCH,
      CLUSTER_SETSLOT,
      clusterSetSlot: CLUSTER_SETSLOT,
      CLUSTER_SLOTS,
      clusterSlots: CLUSTER_SLOTS,
      COMMAND_COUNT,
      commandCount: COMMAND_COUNT,
      COMMAND_GETKEYS,
      commandGetKeys: COMMAND_GETKEYS,
      COMMAND_GETKEYSANDFLAGS,
      commandGetKeysAndFlags: COMMAND_GETKEYSANDFLAGS,
      COMMAND_INFO,
      commandInfo: COMMAND_INFO,
      COMMAND_LIST,
      commandList: COMMAND_LIST,
      COMMAND,
      command: COMMAND,
      CONFIG_GET,
      configGet: CONFIG_GET,
      CONFIG_RESETASTAT,
      configResetStat: CONFIG_RESETASTAT,
      CONFIG_REWRITE,
      configRewrite: CONFIG_REWRITE,
      CONFIG_SET,
      configSet: CONFIG_SET,
      DBSIZE,
      dbSize: DBSIZE,
      DISCARD,
      discard: DISCARD,
      ECHO,
      echo: ECHO,
      FAILOVER,
      failover: FAILOVER,
      FLUSHALL,
      flushAll: FLUSHALL,
      FLUSHDB,
      flushDb: FLUSHDB,
      FUNCTION_DELETE,
      functionDelete: FUNCTION_DELETE,
      FUNCTION_DUMP,
      functionDump: FUNCTION_DUMP,
      FUNCTION_FLUSH,
      functionFlush: FUNCTION_FLUSH,
      FUNCTION_KILL,
      functionKill: FUNCTION_KILL,
      FUNCTION_LIST_WITHCODE,
      functionListWithCode: FUNCTION_LIST_WITHCODE,
      FUNCTION_LIST,
      functionList: FUNCTION_LIST,
      FUNCTION_LOAD,
      functionLoad: FUNCTION_LOAD,
      FUNCTION_RESTORE,
      functionRestore: FUNCTION_RESTORE,
      FUNCTION_STATS,
      functionStats: FUNCTION_STATS,
      HELLO,
      hello: HELLO,
      INFO,
      info: INFO,
      KEYS,
      keys: KEYS,
      LASTSAVE,
      lastSave: LASTSAVE,
      LATENCY_DOCTOR,
      latencyDoctor: LATENCY_DOCTOR,
      LATENCY_GRAPH,
      latencyGraph: LATENCY_GRAPH,
      LATENCY_HISTORY,
      latencyHistory: LATENCY_HISTORY,
      LATENCY_LATEST,
      latencyLatest: LATENCY_LATEST,
      LOLWUT,
      lolwut: LOLWUT,
      MEMORY_DOCTOR,
      memoryDoctor: MEMORY_DOCTOR,
      "MEMORY_MALLOC-STATS": MEMORY_MALLOC_STATS,
      memoryMallocStats: MEMORY_MALLOC_STATS,
      MEMORY_PURGE,
      memoryPurge: MEMORY_PURGE,
      MEMORY_STATS,
      memoryStats: MEMORY_STATS,
      MEMORY_USAGE,
      memoryUsage: MEMORY_USAGE,
      MODULE_LIST,
      moduleList: MODULE_LIST,
      MODULE_LOAD,
      moduleLoad: MODULE_LOAD,
      MODULE_UNLOAD,
      moduleUnload: MODULE_UNLOAD,
      MOVE,
      move: MOVE,
      PING,
      ping: PING,
      PUBSUB_CHANNELS,
      pubSubChannels: PUBSUB_CHANNELS,
      PUBSUB_NUMPAT,
      pubSubNumPat: PUBSUB_NUMPAT,
      PUBSUB_NUMSUB,
      pubSubNumSub: PUBSUB_NUMSUB,
      PUBSUB_SHARDCHANNELS,
      pubSubShardChannels: PUBSUB_SHARDCHANNELS,
      PUBSUB_SHARDNUMSUB,
      pubSubShardNumSub: PUBSUB_SHARDNUMSUB,
      RANDOMKEY,
      randomKey: RANDOMKEY,
      READONLY,
      readonly: READONLY,
      READWRITE,
      readwrite: READWRITE,
      REPLICAOF,
      replicaOf: REPLICAOF,
      "RESTORE-ASKING": RESTORE_ASKING,
      restoreAsking: RESTORE_ASKING,
      ROLE,
      role: ROLE,
      SAVE,
      save: SAVE,
      SCAN,
      scan: SCAN,
      SCRIPT_DEBUG,
      scriptDebug: SCRIPT_DEBUG,
      SCRIPT_EXISTS,
      scriptExists: SCRIPT_EXISTS,
      SCRIPT_FLUSH,
      scriptFlush: SCRIPT_FLUSH,
      SCRIPT_KILL,
      scriptKill: SCRIPT_KILL,
      SCRIPT_LOAD,
      scriptLoad: SCRIPT_LOAD,
      SHUTDOWN,
      shutdown: SHUTDOWN,
      SWAPDB,
      swapDb: SWAPDB,
      TIME,
      time: TIME,
      UNWATCH,
      unwatch: UNWATCH,
      WAIT,
      wait: WAIT
    };
  }
});

// node_modules/@redis/client/dist/lib/errors.js
var require_errors = __commonJS({
  "node_modules/@redis/client/dist/lib/errors.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ErrorReply = exports.ReconnectStrategyError = exports.RootNodesUnavailableError = exports.SocketClosedUnexpectedlyError = exports.DisconnectsClientError = exports.ClientOfflineError = exports.ClientClosedError = exports.ConnectionTimeoutError = exports.WatchError = exports.AbortError = void 0;
    var AbortError = class extends Error {
      constructor() {
        super("The command was aborted");
      }
    };
    exports.AbortError = AbortError;
    var WatchError = class extends Error {
      constructor() {
        super("One (or more) of the watched keys has been changed");
      }
    };
    exports.WatchError = WatchError;
    var ConnectionTimeoutError = class extends Error {
      constructor() {
        super("Connection timeout");
      }
    };
    exports.ConnectionTimeoutError = ConnectionTimeoutError;
    var ClientClosedError = class extends Error {
      constructor() {
        super("The client is closed");
      }
    };
    exports.ClientClosedError = ClientClosedError;
    var ClientOfflineError = class extends Error {
      constructor() {
        super("The client is offline");
      }
    };
    exports.ClientOfflineError = ClientOfflineError;
    var DisconnectsClientError = class extends Error {
      constructor() {
        super("Disconnects client");
      }
    };
    exports.DisconnectsClientError = DisconnectsClientError;
    var SocketClosedUnexpectedlyError = class extends Error {
      constructor() {
        super("Socket closed unexpectedly");
      }
    };
    exports.SocketClosedUnexpectedlyError = SocketClosedUnexpectedlyError;
    var RootNodesUnavailableError = class extends Error {
      constructor() {
        super("All the root nodes are unavailable");
      }
    };
    exports.RootNodesUnavailableError = RootNodesUnavailableError;
    var ReconnectStrategyError = class extends Error {
      constructor(originalError, socketError) {
        super(originalError.message);
        Object.defineProperty(this, "originalError", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "socketError", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        this.originalError = originalError;
        this.socketError = socketError;
      }
    };
    exports.ReconnectStrategyError = ReconnectStrategyError;
    var ErrorReply = class extends Error {
      constructor(message) {
        super(message);
        this.stack = void 0;
      }
    };
    exports.ErrorReply = ErrorReply;
  }
});

// node_modules/@redis/client/dist/lib/utils.js
var require_utils4 = __commonJS({
  "node_modules/@redis/client/dist/lib/utils.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.promiseTimeout = void 0;
    function promiseTimeout(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    exports.promiseTimeout = promiseTimeout;
  }
});

// node_modules/@redis/client/dist/lib/client/socket.js
var require_socket = __commonJS({
  "node_modules/@redis/client/dist/lib/client/socket.js"(exports) {
    "use strict";
    var __classPrivateFieldGet = exports && exports.__classPrivateFieldGet || function(receiver, state, kind, f) {
      if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a getter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot read private member from an object whose class did not declare it");
      return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    };
    var __classPrivateFieldSet = exports && exports.__classPrivateFieldSet || function(receiver, state, value, kind, f) {
      if (kind === "m")
        throw new TypeError("Private method is not writable");
      if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a setter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot write private member to an object whose class did not declare it");
      return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
    };
    var _RedisSocket_instances;
    var _a;
    var _RedisSocket_initiateOptions;
    var _RedisSocket_isTlsSocket;
    var _RedisSocket_initiator;
    var _RedisSocket_options;
    var _RedisSocket_socket;
    var _RedisSocket_isOpen;
    var _RedisSocket_isReady;
    var _RedisSocket_writableNeedDrain;
    var _RedisSocket_isSocketUnrefed;
    var _RedisSocket_reconnectStrategy;
    var _RedisSocket_shouldReconnect;
    var _RedisSocket_connect;
    var _RedisSocket_createSocket;
    var _RedisSocket_createNetSocket;
    var _RedisSocket_createTlsSocket;
    var _RedisSocket_onSocketError;
    var _RedisSocket_disconnect;
    var _RedisSocket_isCorked;
    Object.defineProperty(exports, "__esModule", { value: true });
    var events_1 = require("events");
    var net = require("net");
    var tls = require("tls");
    var errors_1 = require_errors();
    var utils_1 = require_utils4();
    var RedisSocket = class extends events_1.EventEmitter {
      get isOpen() {
        return __classPrivateFieldGet(this, _RedisSocket_isOpen, "f");
      }
      get isReady() {
        return __classPrivateFieldGet(this, _RedisSocket_isReady, "f");
      }
      get writableNeedDrain() {
        return __classPrivateFieldGet(this, _RedisSocket_writableNeedDrain, "f");
      }
      constructor(initiator, options) {
        super();
        _RedisSocket_instances.add(this);
        _RedisSocket_initiator.set(this, void 0);
        _RedisSocket_options.set(this, void 0);
        _RedisSocket_socket.set(this, void 0);
        _RedisSocket_isOpen.set(this, false);
        _RedisSocket_isReady.set(this, false);
        _RedisSocket_writableNeedDrain.set(this, false);
        _RedisSocket_isSocketUnrefed.set(this, false);
        _RedisSocket_isCorked.set(this, false);
        __classPrivateFieldSet(this, _RedisSocket_initiator, initiator, "f");
        __classPrivateFieldSet(this, _RedisSocket_options, __classPrivateFieldGet(_a, _a, "m", _RedisSocket_initiateOptions).call(_a, options), "f");
      }
      async connect() {
        if (__classPrivateFieldGet(this, _RedisSocket_isOpen, "f")) {
          throw new Error("Socket already opened");
        }
        __classPrivateFieldSet(this, _RedisSocket_isOpen, true, "f");
        return __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_connect).call(this);
      }
      writeCommand(args) {
        if (!__classPrivateFieldGet(this, _RedisSocket_socket, "f")) {
          throw new errors_1.ClientClosedError();
        }
        for (const toWrite of args) {
          __classPrivateFieldSet(this, _RedisSocket_writableNeedDrain, !__classPrivateFieldGet(this, _RedisSocket_socket, "f").write(toWrite), "f");
        }
      }
      disconnect() {
        if (!__classPrivateFieldGet(this, _RedisSocket_isOpen, "f")) {
          throw new errors_1.ClientClosedError();
        }
        __classPrivateFieldSet(this, _RedisSocket_isOpen, false, "f");
        __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_disconnect).call(this);
      }
      async quit(fn) {
        if (!__classPrivateFieldGet(this, _RedisSocket_isOpen, "f")) {
          throw new errors_1.ClientClosedError();
        }
        __classPrivateFieldSet(this, _RedisSocket_isOpen, false, "f");
        const reply = await fn();
        __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_disconnect).call(this);
        return reply;
      }
      cork() {
        if (!__classPrivateFieldGet(this, _RedisSocket_socket, "f") || __classPrivateFieldGet(this, _RedisSocket_isCorked, "f")) {
          return;
        }
        __classPrivateFieldGet(this, _RedisSocket_socket, "f").cork();
        __classPrivateFieldSet(this, _RedisSocket_isCorked, true, "f");
        setImmediate(() => {
          __classPrivateFieldGet(this, _RedisSocket_socket, "f")?.uncork();
          __classPrivateFieldSet(this, _RedisSocket_isCorked, false, "f");
        });
      }
      ref() {
        __classPrivateFieldSet(this, _RedisSocket_isSocketUnrefed, false, "f");
        __classPrivateFieldGet(this, _RedisSocket_socket, "f")?.ref();
      }
      unref() {
        __classPrivateFieldSet(this, _RedisSocket_isSocketUnrefed, true, "f");
        __classPrivateFieldGet(this, _RedisSocket_socket, "f")?.unref();
      }
    };
    _a = RedisSocket, _RedisSocket_initiator = /* @__PURE__ */ new WeakMap(), _RedisSocket_options = /* @__PURE__ */ new WeakMap(), _RedisSocket_socket = /* @__PURE__ */ new WeakMap(), _RedisSocket_isOpen = /* @__PURE__ */ new WeakMap(), _RedisSocket_isReady = /* @__PURE__ */ new WeakMap(), _RedisSocket_writableNeedDrain = /* @__PURE__ */ new WeakMap(), _RedisSocket_isSocketUnrefed = /* @__PURE__ */ new WeakMap(), _RedisSocket_isCorked = /* @__PURE__ */ new WeakMap(), _RedisSocket_instances = /* @__PURE__ */ new WeakSet(), _RedisSocket_initiateOptions = function _RedisSocket_initiateOptions2(options) {
      var _b, _c;
      options ?? (options = {});
      if (!options.path) {
        (_b = options).port ?? (_b.port = 6379);
        (_c = options).host ?? (_c.host = "localhost");
      }
      options.connectTimeout ?? (options.connectTimeout = 5e3);
      options.keepAlive ?? (options.keepAlive = 5e3);
      options.noDelay ?? (options.noDelay = true);
      return options;
    }, _RedisSocket_isTlsSocket = function _RedisSocket_isTlsSocket2(options) {
      return options.tls === true;
    }, _RedisSocket_reconnectStrategy = function _RedisSocket_reconnectStrategy2(retries, cause) {
      if (__classPrivateFieldGet(this, _RedisSocket_options, "f").reconnectStrategy === false) {
        return false;
      } else if (typeof __classPrivateFieldGet(this, _RedisSocket_options, "f").reconnectStrategy === "number") {
        return __classPrivateFieldGet(this, _RedisSocket_options, "f").reconnectStrategy;
      } else if (__classPrivateFieldGet(this, _RedisSocket_options, "f").reconnectStrategy) {
        try {
          const retryIn = __classPrivateFieldGet(this, _RedisSocket_options, "f").reconnectStrategy(retries, cause);
          if (retryIn !== false && !(retryIn instanceof Error) && typeof retryIn !== "number") {
            throw new TypeError(`Reconnect strategy should return \`false | Error | number\`, got ${retryIn} instead`);
          }
          return retryIn;
        } catch (err) {
          this.emit("error", err);
        }
      }
      return Math.min(retries * 50, 500);
    }, _RedisSocket_shouldReconnect = function _RedisSocket_shouldReconnect2(retries, cause) {
      const retryIn = __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_reconnectStrategy).call(this, retries, cause);
      if (retryIn === false) {
        __classPrivateFieldSet(this, _RedisSocket_isOpen, false, "f");
        this.emit("error", cause);
        return cause;
      } else if (retryIn instanceof Error) {
        __classPrivateFieldSet(this, _RedisSocket_isOpen, false, "f");
        this.emit("error", cause);
        return new errors_1.ReconnectStrategyError(retryIn, cause);
      }
      return retryIn;
    }, _RedisSocket_connect = async function _RedisSocket_connect2() {
      let retries = 0;
      do {
        try {
          __classPrivateFieldSet(this, _RedisSocket_socket, await __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_createSocket).call(this), "f");
          __classPrivateFieldSet(this, _RedisSocket_writableNeedDrain, false, "f");
          this.emit("connect");
          try {
            await __classPrivateFieldGet(this, _RedisSocket_initiator, "f").call(this);
          } catch (err) {
            __classPrivateFieldGet(this, _RedisSocket_socket, "f").destroy();
            __classPrivateFieldSet(this, _RedisSocket_socket, void 0, "f");
            throw err;
          }
          __classPrivateFieldSet(this, _RedisSocket_isReady, true, "f");
          this.emit("ready");
        } catch (err) {
          const retryIn = __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_shouldReconnect).call(this, retries++, err);
          if (typeof retryIn !== "number") {
            throw retryIn;
          }
          this.emit("error", err);
          await (0, utils_1.promiseTimeout)(retryIn);
          this.emit("reconnecting");
        }
      } while (__classPrivateFieldGet(this, _RedisSocket_isOpen, "f") && !__classPrivateFieldGet(this, _RedisSocket_isReady, "f"));
    }, _RedisSocket_createSocket = function _RedisSocket_createSocket2() {
      return new Promise((resolve, reject) => {
        const { connectEvent, socket } = __classPrivateFieldGet(_a, _a, "m", _RedisSocket_isTlsSocket).call(_a, __classPrivateFieldGet(this, _RedisSocket_options, "f")) ? __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_createTlsSocket).call(this) : __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_createNetSocket).call(this);
        if (__classPrivateFieldGet(this, _RedisSocket_options, "f").connectTimeout) {
          socket.setTimeout(__classPrivateFieldGet(this, _RedisSocket_options, "f").connectTimeout, () => socket.destroy(new errors_1.ConnectionTimeoutError()));
        }
        if (__classPrivateFieldGet(this, _RedisSocket_isSocketUnrefed, "f")) {
          socket.unref();
        }
        socket.setNoDelay(__classPrivateFieldGet(this, _RedisSocket_options, "f").noDelay).once("error", reject).once(connectEvent, () => {
          socket.setTimeout(0).setKeepAlive(__classPrivateFieldGet(this, _RedisSocket_options, "f").keepAlive !== false, __classPrivateFieldGet(this, _RedisSocket_options, "f").keepAlive || 0).off("error", reject).once("error", (err) => __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_onSocketError).call(this, err)).once("close", (hadError) => {
            if (!hadError && __classPrivateFieldGet(this, _RedisSocket_isReady, "f") && __classPrivateFieldGet(this, _RedisSocket_socket, "f") === socket) {
              __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_onSocketError).call(this, new errors_1.SocketClosedUnexpectedlyError());
            }
          }).on("drain", () => {
            __classPrivateFieldSet(this, _RedisSocket_writableNeedDrain, false, "f");
            this.emit("drain");
          }).on("data", (data) => this.emit("data", data));
          resolve(socket);
        });
      });
    }, _RedisSocket_createNetSocket = function _RedisSocket_createNetSocket2() {
      return {
        connectEvent: "connect",
        socket: net.connect(__classPrivateFieldGet(this, _RedisSocket_options, "f"))
        // TODO
      };
    }, _RedisSocket_createTlsSocket = function _RedisSocket_createTlsSocket2() {
      return {
        connectEvent: "secureConnect",
        socket: tls.connect(__classPrivateFieldGet(this, _RedisSocket_options, "f"))
        // TODO
      };
    }, _RedisSocket_onSocketError = function _RedisSocket_onSocketError2(err) {
      __classPrivateFieldSet(this, _RedisSocket_isReady, false, "f");
      this.emit("error", err);
      if (!__classPrivateFieldGet(this, _RedisSocket_isOpen, "f") || typeof __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_shouldReconnect).call(this, 0, err) !== "number")
        return;
      this.emit("reconnecting");
      __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_connect).call(this).catch(() => {
      });
    }, _RedisSocket_disconnect = function _RedisSocket_disconnect2() {
      __classPrivateFieldSet(this, _RedisSocket_isReady, false, "f");
      if (__classPrivateFieldGet(this, _RedisSocket_socket, "f")) {
        __classPrivateFieldGet(this, _RedisSocket_socket, "f").destroy();
        __classPrivateFieldSet(this, _RedisSocket_socket, void 0, "f");
      }
      this.emit("end");
    };
    exports.default = RedisSocket;
  }
});

// node_modules/@redis/client/node_modules/yallist/iterator.js
var require_iterator = __commonJS({
  "node_modules/@redis/client/node_modules/yallist/iterator.js"(exports, module2) {
    "use strict";
    module2.exports = function(Yallist) {
      Yallist.prototype[Symbol.iterator] = function* () {
        for (let walker = this.head; walker; walker = walker.next) {
          yield walker.value;
        }
      };
    };
  }
});

// node_modules/@redis/client/node_modules/yallist/yallist.js
var require_yallist = __commonJS({
  "node_modules/@redis/client/node_modules/yallist/yallist.js"(exports, module2) {
    "use strict";
    module2.exports = Yallist;
    Yallist.Node = Node;
    Yallist.create = Yallist;
    function Yallist(list) {
      var self = this;
      if (!(self instanceof Yallist)) {
        self = new Yallist();
      }
      self.tail = null;
      self.head = null;
      self.length = 0;
      if (list && typeof list.forEach === "function") {
        list.forEach(function(item) {
          self.push(item);
        });
      } else if (arguments.length > 0) {
        for (var i = 0, l = arguments.length; i < l; i++) {
          self.push(arguments[i]);
        }
      }
      return self;
    }
    Yallist.prototype.removeNode = function(node) {
      if (node.list !== this) {
        throw new Error("removing node which does not belong to this list");
      }
      var next = node.next;
      var prev = node.prev;
      if (next) {
        next.prev = prev;
      }
      if (prev) {
        prev.next = next;
      }
      if (node === this.head) {
        this.head = next;
      }
      if (node === this.tail) {
        this.tail = prev;
      }
      node.list.length--;
      node.next = null;
      node.prev = null;
      node.list = null;
      return next;
    };
    Yallist.prototype.unshiftNode = function(node) {
      if (node === this.head) {
        return;
      }
      if (node.list) {
        node.list.removeNode(node);
      }
      var head = this.head;
      node.list = this;
      node.next = head;
      if (head) {
        head.prev = node;
      }
      this.head = node;
      if (!this.tail) {
        this.tail = node;
      }
      this.length++;
    };
    Yallist.prototype.pushNode = function(node) {
      if (node === this.tail) {
        return;
      }
      if (node.list) {
        node.list.removeNode(node);
      }
      var tail = this.tail;
      node.list = this;
      node.prev = tail;
      if (tail) {
        tail.next = node;
      }
      this.tail = node;
      if (!this.head) {
        this.head = node;
      }
      this.length++;
    };
    Yallist.prototype.push = function() {
      for (var i = 0, l = arguments.length; i < l; i++) {
        push(this, arguments[i]);
      }
      return this.length;
    };
    Yallist.prototype.unshift = function() {
      for (var i = 0, l = arguments.length; i < l; i++) {
        unshift(this, arguments[i]);
      }
      return this.length;
    };
    Yallist.prototype.pop = function() {
      if (!this.tail) {
        return void 0;
      }
      var res = this.tail.value;
      this.tail = this.tail.prev;
      if (this.tail) {
        this.tail.next = null;
      } else {
        this.head = null;
      }
      this.length--;
      return res;
    };
    Yallist.prototype.shift = function() {
      if (!this.head) {
        return void 0;
      }
      var res = this.head.value;
      this.head = this.head.next;
      if (this.head) {
        this.head.prev = null;
      } else {
        this.tail = null;
      }
      this.length--;
      return res;
    };
    Yallist.prototype.forEach = function(fn, thisp) {
      thisp = thisp || this;
      for (var walker = this.head, i = 0; walker !== null; i++) {
        fn.call(thisp, walker.value, i, this);
        walker = walker.next;
      }
    };
    Yallist.prototype.forEachReverse = function(fn, thisp) {
      thisp = thisp || this;
      for (var walker = this.tail, i = this.length - 1; walker !== null; i--) {
        fn.call(thisp, walker.value, i, this);
        walker = walker.prev;
      }
    };
    Yallist.prototype.get = function(n) {
      for (var i = 0, walker = this.head; walker !== null && i < n; i++) {
        walker = walker.next;
      }
      if (i === n && walker !== null) {
        return walker.value;
      }
    };
    Yallist.prototype.getReverse = function(n) {
      for (var i = 0, walker = this.tail; walker !== null && i < n; i++) {
        walker = walker.prev;
      }
      if (i === n && walker !== null) {
        return walker.value;
      }
    };
    Yallist.prototype.map = function(fn, thisp) {
      thisp = thisp || this;
      var res = new Yallist();
      for (var walker = this.head; walker !== null; ) {
        res.push(fn.call(thisp, walker.value, this));
        walker = walker.next;
      }
      return res;
    };
    Yallist.prototype.mapReverse = function(fn, thisp) {
      thisp = thisp || this;
      var res = new Yallist();
      for (var walker = this.tail; walker !== null; ) {
        res.push(fn.call(thisp, walker.value, this));
        walker = walker.prev;
      }
      return res;
    };
    Yallist.prototype.reduce = function(fn, initial) {
      var acc;
      var walker = this.head;
      if (arguments.length > 1) {
        acc = initial;
      } else if (this.head) {
        walker = this.head.next;
        acc = this.head.value;
      } else {
        throw new TypeError("Reduce of empty list with no initial value");
      }
      for (var i = 0; walker !== null; i++) {
        acc = fn(acc, walker.value, i);
        walker = walker.next;
      }
      return acc;
    };
    Yallist.prototype.reduceReverse = function(fn, initial) {
      var acc;
      var walker = this.tail;
      if (arguments.length > 1) {
        acc = initial;
      } else if (this.tail) {
        walker = this.tail.prev;
        acc = this.tail.value;
      } else {
        throw new TypeError("Reduce of empty list with no initial value");
      }
      for (var i = this.length - 1; walker !== null; i--) {
        acc = fn(acc, walker.value, i);
        walker = walker.prev;
      }
      return acc;
    };
    Yallist.prototype.toArray = function() {
      var arr = new Array(this.length);
      for (var i = 0, walker = this.head; walker !== null; i++) {
        arr[i] = walker.value;
        walker = walker.next;
      }
      return arr;
    };
    Yallist.prototype.toArrayReverse = function() {
      var arr = new Array(this.length);
      for (var i = 0, walker = this.tail; walker !== null; i++) {
        arr[i] = walker.value;
        walker = walker.prev;
      }
      return arr;
    };
    Yallist.prototype.slice = function(from, to) {
      to = to || this.length;
      if (to < 0) {
        to += this.length;
      }
      from = from || 0;
      if (from < 0) {
        from += this.length;
      }
      var ret = new Yallist();
      if (to < from || to < 0) {
        return ret;
      }
      if (from < 0) {
        from = 0;
      }
      if (to > this.length) {
        to = this.length;
      }
      for (var i = 0, walker = this.head; walker !== null && i < from; i++) {
        walker = walker.next;
      }
      for (; walker !== null && i < to; i++, walker = walker.next) {
        ret.push(walker.value);
      }
      return ret;
    };
    Yallist.prototype.sliceReverse = function(from, to) {
      to = to || this.length;
      if (to < 0) {
        to += this.length;
      }
      from = from || 0;
      if (from < 0) {
        from += this.length;
      }
      var ret = new Yallist();
      if (to < from || to < 0) {
        return ret;
      }
      if (from < 0) {
        from = 0;
      }
      if (to > this.length) {
        to = this.length;
      }
      for (var i = this.length, walker = this.tail; walker !== null && i > to; i--) {
        walker = walker.prev;
      }
      for (; walker !== null && i > from; i--, walker = walker.prev) {
        ret.push(walker.value);
      }
      return ret;
    };
    Yallist.prototype.splice = function(start, deleteCount, ...nodes) {
      if (start > this.length) {
        start = this.length - 1;
      }
      if (start < 0) {
        start = this.length + start;
      }
      for (var i = 0, walker = this.head; walker !== null && i < start; i++) {
        walker = walker.next;
      }
      var ret = [];
      for (var i = 0; walker && i < deleteCount; i++) {
        ret.push(walker.value);
        walker = this.removeNode(walker);
      }
      if (walker === null) {
        walker = this.tail;
      }
      if (walker !== this.head && walker !== this.tail) {
        walker = walker.prev;
      }
      for (var i = 0; i < nodes.length; i++) {
        walker = insert(this, walker, nodes[i]);
      }
      return ret;
    };
    Yallist.prototype.reverse = function() {
      var head = this.head;
      var tail = this.tail;
      for (var walker = head; walker !== null; walker = walker.prev) {
        var p = walker.prev;
        walker.prev = walker.next;
        walker.next = p;
      }
      this.head = tail;
      this.tail = head;
      return this;
    };
    function insert(self, node, value) {
      var inserted = node === self.head ? new Node(value, null, node, self) : new Node(value, node, node.next, self);
      if (inserted.next === null) {
        self.tail = inserted;
      }
      if (inserted.prev === null) {
        self.head = inserted;
      }
      self.length++;
      return inserted;
    }
    function push(self, item) {
      self.tail = new Node(item, self.tail, null, self);
      if (!self.head) {
        self.head = self.tail;
      }
      self.length++;
    }
    function unshift(self, item) {
      self.head = new Node(item, null, self.head, self);
      if (!self.tail) {
        self.tail = self.head;
      }
      self.length++;
    }
    function Node(value, prev, next, list) {
      if (!(this instanceof Node)) {
        return new Node(value, prev, next, list);
      }
      this.list = list;
      this.value = value;
      if (prev) {
        prev.next = this;
        this.prev = prev;
      } else {
        this.prev = null;
      }
      if (next) {
        next.prev = this;
        this.next = next;
      } else {
        this.next = null;
      }
    }
    try {
      require_iterator()(Yallist);
    } catch (er) {
    }
  }
});

// node_modules/@redis/client/dist/lib/client/RESP2/composers/buffer.js
var require_buffer = __commonJS({
  "node_modules/@redis/client/dist/lib/client/RESP2/composers/buffer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var BufferComposer = class {
      constructor() {
        Object.defineProperty(this, "chunks", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: []
        });
      }
      write(buffer) {
        this.chunks.push(buffer);
      }
      end(buffer) {
        this.write(buffer);
        return Buffer.concat(this.chunks.splice(0));
      }
      reset() {
        this.chunks = [];
      }
    };
    exports.default = BufferComposer;
  }
});

// node_modules/@redis/client/dist/lib/client/RESP2/composers/string.js
var require_string = __commonJS({
  "node_modules/@redis/client/dist/lib/client/RESP2/composers/string.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var string_decoder_1 = require("string_decoder");
    var StringComposer = class {
      constructor() {
        Object.defineProperty(this, "decoder", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: new string_decoder_1.StringDecoder()
        });
        Object.defineProperty(this, "string", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: ""
        });
      }
      write(buffer) {
        this.string += this.decoder.write(buffer);
      }
      end(buffer) {
        const string = this.string + this.decoder.end(buffer);
        this.string = "";
        return string;
      }
      reset() {
        this.string = "";
      }
    };
    exports.default = StringComposer;
  }
});

// node_modules/@redis/client/dist/lib/client/RESP2/decoder.js
var require_decoder = __commonJS({
  "node_modules/@redis/client/dist/lib/client/RESP2/decoder.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var errors_1 = require_errors();
    var buffer_1 = require_buffer();
    var string_1 = require_string();
    var Types;
    (function(Types2) {
      Types2[Types2["SIMPLE_STRING"] = 43] = "SIMPLE_STRING";
      Types2[Types2["ERROR"] = 45] = "ERROR";
      Types2[Types2["INTEGER"] = 58] = "INTEGER";
      Types2[Types2["BULK_STRING"] = 36] = "BULK_STRING";
      Types2[Types2["ARRAY"] = 42] = "ARRAY";
    })(Types || (Types = {}));
    var ASCII;
    (function(ASCII2) {
      ASCII2[ASCII2["CR"] = 13] = "CR";
      ASCII2[ASCII2["ZERO"] = 48] = "ZERO";
      ASCII2[ASCII2["MINUS"] = 45] = "MINUS";
    })(ASCII || (ASCII = {}));
    var RESP2Decoder = class {
      constructor(options) {
        Object.defineProperty(this, "options", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: options
        });
        Object.defineProperty(this, "cursor", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: 0
        });
        Object.defineProperty(this, "type", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "bufferComposer", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: new buffer_1.default()
        });
        Object.defineProperty(this, "stringComposer", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: new string_1.default()
        });
        Object.defineProperty(this, "currentStringComposer", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.stringComposer
        });
        Object.defineProperty(this, "integer", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: 0
        });
        Object.defineProperty(this, "isNegativeInteger", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "bulkStringRemainingLength", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "arraysInProcess", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: []
        });
        Object.defineProperty(this, "initializeArray", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: false
        });
        Object.defineProperty(this, "arrayItemType", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
      }
      reset() {
        this.cursor = 0;
        this.type = void 0;
        this.bufferComposer.reset();
        this.stringComposer.reset();
        this.currentStringComposer = this.stringComposer;
      }
      write(chunk) {
        while (this.cursor < chunk.length) {
          if (!this.type) {
            this.currentStringComposer = this.options.returnStringsAsBuffers() ? this.bufferComposer : this.stringComposer;
            this.type = chunk[this.cursor];
            if (++this.cursor >= chunk.length)
              break;
          }
          const reply = this.parseType(chunk, this.type);
          if (reply === void 0)
            break;
          this.type = void 0;
          this.options.onReply(reply);
        }
        this.cursor -= chunk.length;
      }
      parseType(chunk, type, arraysToKeep) {
        switch (type) {
          case Types.SIMPLE_STRING:
            return this.parseSimpleString(chunk);
          case Types.ERROR:
            return this.parseError(chunk);
          case Types.INTEGER:
            return this.parseInteger(chunk);
          case Types.BULK_STRING:
            return this.parseBulkString(chunk);
          case Types.ARRAY:
            return this.parseArray(chunk, arraysToKeep);
        }
      }
      compose(chunk, composer) {
        for (let i = this.cursor; i < chunk.length; i++) {
          if (chunk[i] === ASCII.CR) {
            const reply = composer.end(chunk.subarray(this.cursor, i));
            this.cursor = i + 2;
            return reply;
          }
        }
        const toWrite = chunk.subarray(this.cursor);
        composer.write(toWrite);
        this.cursor = chunk.length;
      }
      parseSimpleString(chunk) {
        return this.compose(chunk, this.currentStringComposer);
      }
      parseError(chunk) {
        const message = this.compose(chunk, this.stringComposer);
        if (message !== void 0) {
          return new errors_1.ErrorReply(message);
        }
      }
      parseInteger(chunk) {
        if (this.isNegativeInteger === void 0) {
          this.isNegativeInteger = chunk[this.cursor] === ASCII.MINUS;
          if (this.isNegativeInteger && ++this.cursor === chunk.length)
            return;
        }
        do {
          const byte = chunk[this.cursor];
          if (byte === ASCII.CR) {
            const integer = this.isNegativeInteger ? -this.integer : this.integer;
            this.integer = 0;
            this.isNegativeInteger = void 0;
            this.cursor += 2;
            return integer;
          }
          this.integer = this.integer * 10 + byte - ASCII.ZERO;
        } while (++this.cursor < chunk.length);
      }
      parseBulkString(chunk) {
        if (this.bulkStringRemainingLength === void 0) {
          const length = this.parseInteger(chunk);
          if (length === void 0)
            return;
          if (length === -1)
            return null;
          this.bulkStringRemainingLength = length;
          if (this.cursor >= chunk.length)
            return;
        }
        const end = this.cursor + this.bulkStringRemainingLength;
        if (chunk.length >= end) {
          const reply = this.currentStringComposer.end(chunk.subarray(this.cursor, end));
          this.bulkStringRemainingLength = void 0;
          this.cursor = end + 2;
          return reply;
        }
        const toWrite = chunk.subarray(this.cursor);
        this.currentStringComposer.write(toWrite);
        this.bulkStringRemainingLength -= toWrite.length;
        this.cursor = chunk.length;
      }
      parseArray(chunk, arraysToKeep = 0) {
        if (this.initializeArray || this.arraysInProcess.length === arraysToKeep) {
          const length = this.parseInteger(chunk);
          if (length === void 0) {
            this.initializeArray = true;
            return void 0;
          }
          this.initializeArray = false;
          this.arrayItemType = void 0;
          if (length === -1) {
            return this.returnArrayReply(null, arraysToKeep, chunk);
          } else if (length === 0) {
            return this.returnArrayReply([], arraysToKeep, chunk);
          }
          this.arraysInProcess.push({
            array: new Array(length),
            pushCounter: 0
          });
        }
        while (this.cursor < chunk.length) {
          if (!this.arrayItemType) {
            this.arrayItemType = chunk[this.cursor];
            if (++this.cursor >= chunk.length)
              break;
          }
          const item = this.parseType(chunk, this.arrayItemType, arraysToKeep + 1);
          if (item === void 0)
            break;
          this.arrayItemType = void 0;
          const reply = this.pushArrayItem(item, arraysToKeep);
          if (reply !== void 0)
            return reply;
        }
      }
      returnArrayReply(reply, arraysToKeep, chunk) {
        if (this.arraysInProcess.length <= arraysToKeep)
          return reply;
        return this.pushArrayItem(reply, arraysToKeep, chunk);
      }
      pushArrayItem(item, arraysToKeep, chunk) {
        const to = this.arraysInProcess[this.arraysInProcess.length - 1];
        to.array[to.pushCounter] = item;
        if (++to.pushCounter === to.array.length) {
          return this.returnArrayReply(this.arraysInProcess.pop().array, arraysToKeep, chunk);
        } else if (chunk && chunk.length > this.cursor) {
          return this.parseArray(chunk, arraysToKeep);
        }
      }
    };
    exports.default = RESP2Decoder;
  }
});

// node_modules/@redis/client/dist/lib/client/RESP2/encoder.js
var require_encoder = __commonJS({
  "node_modules/@redis/client/dist/lib/client/RESP2/encoder.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var CRLF = "\r\n";
    function encodeCommand(args) {
      const toWrite = [];
      let strings = "*" + args.length + CRLF;
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (typeof arg === "string") {
          strings += "$" + Buffer.byteLength(arg) + CRLF + arg + CRLF;
        } else if (arg instanceof Buffer) {
          toWrite.push(strings + "$" + arg.length.toString() + CRLF, arg);
          strings = CRLF;
        } else {
          throw new TypeError("Invalid argument type");
        }
      }
      toWrite.push(strings);
      return toWrite;
    }
    exports.default = encodeCommand;
  }
});

// node_modules/@redis/client/dist/lib/client/pub-sub.js
var require_pub_sub = __commonJS({
  "node_modules/@redis/client/dist/lib/client/pub-sub.js"(exports) {
    "use strict";
    var __classPrivateFieldGet = exports && exports.__classPrivateFieldGet || function(receiver, state, kind, f) {
      if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a getter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot read private member from an object whose class did not declare it");
      return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    };
    var __classPrivateFieldSet = exports && exports.__classPrivateFieldSet || function(receiver, state, value, kind, f) {
      if (kind === "m")
        throw new TypeError("Private method is not writable");
      if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a setter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot write private member to an object whose class did not declare it");
      return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
    };
    var _PubSub_instances;
    var _a;
    var _PubSub_channelsArray;
    var _PubSub_listenersSet;
    var _PubSub_subscribing;
    var _PubSub_isActive;
    var _PubSub_listeners;
    var _PubSub_extendChannelListeners;
    var _PubSub_unsubscribeCommand;
    var _PubSub_updateIsActive;
    var _PubSub_emitPubSubMessage;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PubSub = exports.PubSubType = void 0;
    var PubSubType;
    (function(PubSubType2) {
      PubSubType2["CHANNELS"] = "CHANNELS";
      PubSubType2["PATTERNS"] = "PATTERNS";
      PubSubType2["SHARDED"] = "SHARDED";
    })(PubSubType || (exports.PubSubType = PubSubType = {}));
    var COMMANDS = {
      [PubSubType.CHANNELS]: {
        subscribe: Buffer.from("subscribe"),
        unsubscribe: Buffer.from("unsubscribe"),
        message: Buffer.from("message")
      },
      [PubSubType.PATTERNS]: {
        subscribe: Buffer.from("psubscribe"),
        unsubscribe: Buffer.from("punsubscribe"),
        message: Buffer.from("pmessage")
      },
      [PubSubType.SHARDED]: {
        subscribe: Buffer.from("ssubscribe"),
        unsubscribe: Buffer.from("sunsubscribe"),
        message: Buffer.from("smessage")
      }
    };
    var PubSub = class {
      constructor() {
        _PubSub_instances.add(this);
        _PubSub_subscribing.set(this, 0);
        _PubSub_isActive.set(this, false);
        _PubSub_listeners.set(this, {
          [PubSubType.CHANNELS]: /* @__PURE__ */ new Map(),
          [PubSubType.PATTERNS]: /* @__PURE__ */ new Map(),
          [PubSubType.SHARDED]: /* @__PURE__ */ new Map()
        });
      }
      static isStatusReply(reply) {
        return COMMANDS[PubSubType.CHANNELS].subscribe.equals(reply[0]) || COMMANDS[PubSubType.CHANNELS].unsubscribe.equals(reply[0]) || COMMANDS[PubSubType.PATTERNS].subscribe.equals(reply[0]) || COMMANDS[PubSubType.PATTERNS].unsubscribe.equals(reply[0]) || COMMANDS[PubSubType.SHARDED].subscribe.equals(reply[0]);
      }
      static isShardedUnsubscribe(reply) {
        return COMMANDS[PubSubType.SHARDED].unsubscribe.equals(reply[0]);
      }
      get isActive() {
        return __classPrivateFieldGet(this, _PubSub_isActive, "f");
      }
      subscribe(type, channels, listener, returnBuffers) {
        var _b;
        const args = [COMMANDS[type].subscribe], channelsArray = __classPrivateFieldGet(_a, _a, "m", _PubSub_channelsArray).call(_a, channels);
        for (const channel of channelsArray) {
          let channelListeners = __classPrivateFieldGet(this, _PubSub_listeners, "f")[type].get(channel);
          if (!channelListeners || channelListeners.unsubscribing) {
            args.push(channel);
          }
        }
        if (args.length === 1) {
          for (const channel of channelsArray) {
            __classPrivateFieldGet(_a, _a, "m", _PubSub_listenersSet).call(_a, __classPrivateFieldGet(this, _PubSub_listeners, "f")[type].get(channel), returnBuffers).add(listener);
          }
          return;
        }
        __classPrivateFieldSet(this, _PubSub_isActive, true, "f");
        __classPrivateFieldSet(this, _PubSub_subscribing, (_b = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b++, _b), "f");
        return {
          args,
          channelsCounter: args.length - 1,
          resolve: () => {
            var _b2;
            __classPrivateFieldSet(this, _PubSub_subscribing, (_b2 = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b2--, _b2), "f");
            for (const channel of channelsArray) {
              let listeners = __classPrivateFieldGet(this, _PubSub_listeners, "f")[type].get(channel);
              if (!listeners) {
                listeners = {
                  unsubscribing: false,
                  buffers: /* @__PURE__ */ new Set(),
                  strings: /* @__PURE__ */ new Set()
                };
                __classPrivateFieldGet(this, _PubSub_listeners, "f")[type].set(channel, listeners);
              }
              __classPrivateFieldGet(_a, _a, "m", _PubSub_listenersSet).call(_a, listeners, returnBuffers).add(listener);
            }
          },
          reject: () => {
            var _b2;
            __classPrivateFieldSet(this, _PubSub_subscribing, (_b2 = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b2--, _b2), "f");
            __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_updateIsActive).call(this);
          }
        };
      }
      extendChannelListeners(type, channel, listeners) {
        var _b;
        if (!__classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_extendChannelListeners).call(this, type, channel, listeners))
          return;
        __classPrivateFieldSet(this, _PubSub_isActive, true, "f");
        __classPrivateFieldSet(this, _PubSub_subscribing, (_b = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b++, _b), "f");
        return {
          args: [
            COMMANDS[type].subscribe,
            channel
          ],
          channelsCounter: 1,
          resolve: () => {
            var _b2, _c;
            return __classPrivateFieldSet(this, _PubSub_subscribing, (_c = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b2 = _c--, _c), "f"), _b2;
          },
          reject: () => {
            var _b2;
            __classPrivateFieldSet(this, _PubSub_subscribing, (_b2 = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b2--, _b2), "f");
            __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_updateIsActive).call(this);
          }
        };
      }
      extendTypeListeners(type, listeners) {
        var _b;
        const args = [COMMANDS[type].subscribe];
        for (const [channel, channelListeners] of listeners) {
          if (__classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_extendChannelListeners).call(this, type, channel, channelListeners)) {
            args.push(channel);
          }
        }
        if (args.length === 1)
          return;
        __classPrivateFieldSet(this, _PubSub_isActive, true, "f");
        __classPrivateFieldSet(this, _PubSub_subscribing, (_b = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b++, _b), "f");
        return {
          args,
          channelsCounter: args.length - 1,
          resolve: () => {
            var _b2, _c;
            return __classPrivateFieldSet(this, _PubSub_subscribing, (_c = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b2 = _c--, _c), "f"), _b2;
          },
          reject: () => {
            var _b2;
            __classPrivateFieldSet(this, _PubSub_subscribing, (_b2 = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b2--, _b2), "f");
            __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_updateIsActive).call(this);
          }
        };
      }
      unsubscribe(type, channels, listener, returnBuffers) {
        const listeners = __classPrivateFieldGet(this, _PubSub_listeners, "f")[type];
        if (!channels) {
          return __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_unsubscribeCommand).call(
            this,
            [COMMANDS[type].unsubscribe],
            // cannot use `this.#subscribed` because there might be some `SUBSCRIBE` commands in the queue
            // cannot use `this.#subscribed + this.#subscribing` because some `SUBSCRIBE` commands might fail
            NaN,
            () => listeners.clear()
          );
        }
        const channelsArray = __classPrivateFieldGet(_a, _a, "m", _PubSub_channelsArray).call(_a, channels);
        if (!listener) {
          return __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_unsubscribeCommand).call(this, [COMMANDS[type].unsubscribe, ...channelsArray], channelsArray.length, () => {
            for (const channel of channelsArray) {
              listeners.delete(channel);
            }
          });
        }
        const args = [COMMANDS[type].unsubscribe];
        for (const channel of channelsArray) {
          const sets = listeners.get(channel);
          if (sets) {
            let current, other;
            if (returnBuffers) {
              current = sets.buffers;
              other = sets.strings;
            } else {
              current = sets.strings;
              other = sets.buffers;
            }
            const currentSize = current.has(listener) ? current.size - 1 : current.size;
            if (currentSize !== 0 || other.size !== 0)
              continue;
            sets.unsubscribing = true;
          }
          args.push(channel);
        }
        if (args.length === 1) {
          for (const channel of channelsArray) {
            __classPrivateFieldGet(_a, _a, "m", _PubSub_listenersSet).call(_a, listeners.get(channel), returnBuffers).delete(listener);
          }
          return;
        }
        return __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_unsubscribeCommand).call(this, args, args.length - 1, () => {
          for (const channel of channelsArray) {
            const sets = listeners.get(channel);
            if (!sets)
              continue;
            (returnBuffers ? sets.buffers : sets.strings).delete(listener);
            if (sets.buffers.size === 0 && sets.strings.size === 0) {
              listeners.delete(channel);
            }
          }
        });
      }
      reset() {
        __classPrivateFieldSet(this, _PubSub_isActive, false, "f");
        __classPrivateFieldSet(this, _PubSub_subscribing, 0, "f");
      }
      resubscribe() {
        var _b;
        const commands = [];
        for (const [type, listeners] of Object.entries(__classPrivateFieldGet(this, _PubSub_listeners, "f"))) {
          if (!listeners.size)
            continue;
          __classPrivateFieldSet(this, _PubSub_isActive, true, "f");
          __classPrivateFieldSet(this, _PubSub_subscribing, (_b = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b++, _b), "f");
          const callback = () => {
            var _b2, _c;
            return __classPrivateFieldSet(this, _PubSub_subscribing, (_c = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b2 = _c--, _c), "f"), _b2;
          };
          commands.push({
            args: [
              COMMANDS[type].subscribe,
              ...listeners.keys()
            ],
            channelsCounter: listeners.size,
            resolve: callback,
            reject: callback
          });
        }
        return commands;
      }
      handleMessageReply(reply) {
        if (COMMANDS[PubSubType.CHANNELS].message.equals(reply[0])) {
          __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_emitPubSubMessage).call(this, PubSubType.CHANNELS, reply[2], reply[1]);
          return true;
        } else if (COMMANDS[PubSubType.PATTERNS].message.equals(reply[0])) {
          __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_emitPubSubMessage).call(this, PubSubType.PATTERNS, reply[3], reply[2], reply[1]);
          return true;
        } else if (COMMANDS[PubSubType.SHARDED].message.equals(reply[0])) {
          __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_emitPubSubMessage).call(this, PubSubType.SHARDED, reply[2], reply[1]);
          return true;
        }
        return false;
      }
      removeShardedListeners(channel) {
        const listeners = __classPrivateFieldGet(this, _PubSub_listeners, "f")[PubSubType.SHARDED].get(channel);
        __classPrivateFieldGet(this, _PubSub_listeners, "f")[PubSubType.SHARDED].delete(channel);
        __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_updateIsActive).call(this);
        return listeners;
      }
      getTypeListeners(type) {
        return __classPrivateFieldGet(this, _PubSub_listeners, "f")[type];
      }
    };
    exports.PubSub = PubSub;
    _a = PubSub, _PubSub_subscribing = /* @__PURE__ */ new WeakMap(), _PubSub_isActive = /* @__PURE__ */ new WeakMap(), _PubSub_listeners = /* @__PURE__ */ new WeakMap(), _PubSub_instances = /* @__PURE__ */ new WeakSet(), _PubSub_channelsArray = function _PubSub_channelsArray2(channels) {
      return Array.isArray(channels) ? channels : [channels];
    }, _PubSub_listenersSet = function _PubSub_listenersSet2(listeners, returnBuffers) {
      return returnBuffers ? listeners.buffers : listeners.strings;
    }, _PubSub_extendChannelListeners = function _PubSub_extendChannelListeners2(type, channel, listeners) {
      const existingListeners = __classPrivateFieldGet(this, _PubSub_listeners, "f")[type].get(channel);
      if (!existingListeners) {
        __classPrivateFieldGet(this, _PubSub_listeners, "f")[type].set(channel, listeners);
        return true;
      }
      for (const listener of listeners.buffers) {
        existingListeners.buffers.add(listener);
      }
      for (const listener of listeners.strings) {
        existingListeners.strings.add(listener);
      }
      return false;
    }, _PubSub_unsubscribeCommand = function _PubSub_unsubscribeCommand2(args, channelsCounter, removeListeners) {
      return {
        args,
        channelsCounter,
        resolve: () => {
          removeListeners();
          __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_updateIsActive).call(this);
        },
        reject: void 0
        // use the same structure as `subscribe`
      };
    }, _PubSub_updateIsActive = function _PubSub_updateIsActive2() {
      __classPrivateFieldSet(this, _PubSub_isActive, __classPrivateFieldGet(this, _PubSub_listeners, "f")[PubSubType.CHANNELS].size !== 0 || __classPrivateFieldGet(this, _PubSub_listeners, "f")[PubSubType.PATTERNS].size !== 0 || __classPrivateFieldGet(this, _PubSub_listeners, "f")[PubSubType.SHARDED].size !== 0 || __classPrivateFieldGet(this, _PubSub_subscribing, "f") !== 0, "f");
    }, _PubSub_emitPubSubMessage = function _PubSub_emitPubSubMessage2(type, message, channel, pattern) {
      const keyString = (pattern ?? channel).toString(), listeners = __classPrivateFieldGet(this, _PubSub_listeners, "f")[type].get(keyString);
      if (!listeners)
        return;
      for (const listener of listeners.buffers) {
        listener(message, channel);
      }
      if (!listeners.strings.size)
        return;
      const channelString = pattern ? channel.toString() : keyString, messageString = channelString === "__redis__:invalidate" ? (
        // https://github.com/redis/redis/pull/7469
        // https://github.com/redis/redis/issues/7463
        message === null ? null : message.map((x) => x.toString())
      ) : message.toString();
      for (const listener of listeners.strings) {
        listener(messageString, channelString);
      }
    };
  }
});

// node_modules/@redis/client/dist/lib/client/commands-queue.js
var require_commands_queue = __commonJS({
  "node_modules/@redis/client/dist/lib/client/commands-queue.js"(exports) {
    "use strict";
    var __classPrivateFieldGet = exports && exports.__classPrivateFieldGet || function(receiver, state, kind, f) {
      if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a getter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot read private member from an object whose class did not declare it");
      return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    };
    var __classPrivateFieldSet = exports && exports.__classPrivateFieldSet || function(receiver, state, value, kind, f) {
      if (kind === "m")
        throw new TypeError("Private method is not writable");
      if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a setter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot write private member to an object whose class did not declare it");
      return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
    };
    var _RedisCommandsQueue_instances;
    var _a;
    var _RedisCommandsQueue_flushQueue;
    var _RedisCommandsQueue_maxLength;
    var _RedisCommandsQueue_waitingToBeSent;
    var _RedisCommandsQueue_waitingForReply;
    var _RedisCommandsQueue_onShardedChannelMoved;
    var _RedisCommandsQueue_pubSub;
    var _RedisCommandsQueue_chainInExecution;
    var _RedisCommandsQueue_decoder;
    var _RedisCommandsQueue_pushPubSubCommand;
    Object.defineProperty(exports, "__esModule", { value: true });
    var LinkedList = require_yallist();
    var errors_1 = require_errors();
    var decoder_1 = require_decoder();
    var encoder_1 = require_encoder();
    var pub_sub_1 = require_pub_sub();
    var PONG = Buffer.from("pong");
    var RedisCommandsQueue = class {
      get isPubSubActive() {
        return __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").isActive;
      }
      constructor(maxLength, onShardedChannelMoved) {
        _RedisCommandsQueue_instances.add(this);
        _RedisCommandsQueue_maxLength.set(this, void 0);
        _RedisCommandsQueue_waitingToBeSent.set(this, new LinkedList());
        _RedisCommandsQueue_waitingForReply.set(this, new LinkedList());
        _RedisCommandsQueue_onShardedChannelMoved.set(this, void 0);
        _RedisCommandsQueue_pubSub.set(this, new pub_sub_1.PubSub());
        _RedisCommandsQueue_chainInExecution.set(this, void 0);
        _RedisCommandsQueue_decoder.set(this, new decoder_1.default({
          returnStringsAsBuffers: () => {
            return !!__classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f").head?.value.returnBuffers || __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").isActive;
          },
          onReply: (reply) => {
            if (__classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").isActive && Array.isArray(reply)) {
              if (__classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").handleMessageReply(reply))
                return;
              const isShardedUnsubscribe = pub_sub_1.PubSub.isShardedUnsubscribe(reply);
              if (isShardedUnsubscribe && !__classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f").length) {
                const channel = reply[1].toString();
                __classPrivateFieldGet(this, _RedisCommandsQueue_onShardedChannelMoved, "f").call(this, channel, __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").removeShardedListeners(channel));
                return;
              } else if (isShardedUnsubscribe || pub_sub_1.PubSub.isStatusReply(reply)) {
                const head = __classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f").head.value;
                if (Number.isNaN(head.channelsCounter) && reply[2] === 0 || --head.channelsCounter === 0) {
                  __classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f").shift().resolve();
                }
                return;
              }
              if (PONG.equals(reply[0])) {
                const { resolve: resolve2, returnBuffers } = __classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f").shift(), buffer = reply[1].length === 0 ? reply[0] : reply[1];
                resolve2(returnBuffers ? buffer : buffer.toString());
                return;
              }
            }
            const { resolve, reject } = __classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f").shift();
            if (reply instanceof errors_1.ErrorReply) {
              reject(reply);
            } else {
              resolve(reply);
            }
          }
        }));
        __classPrivateFieldSet(this, _RedisCommandsQueue_maxLength, maxLength, "f");
        __classPrivateFieldSet(this, _RedisCommandsQueue_onShardedChannelMoved, onShardedChannelMoved, "f");
      }
      addCommand(args, options) {
        if (__classPrivateFieldGet(this, _RedisCommandsQueue_maxLength, "f") && __classPrivateFieldGet(this, _RedisCommandsQueue_waitingToBeSent, "f").length + __classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f").length >= __classPrivateFieldGet(this, _RedisCommandsQueue_maxLength, "f")) {
          return Promise.reject(new Error("The queue is full"));
        } else if (options?.signal?.aborted) {
          return Promise.reject(new errors_1.AbortError());
        }
        return new Promise((resolve, reject) => {
          const node = new LinkedList.Node({
            args,
            chainId: options?.chainId,
            returnBuffers: options?.returnBuffers,
            resolve,
            reject
          });
          if (options?.signal) {
            const listener = () => {
              __classPrivateFieldGet(this, _RedisCommandsQueue_waitingToBeSent, "f").removeNode(node);
              node.value.reject(new errors_1.AbortError());
            };
            node.value.abort = {
              signal: options.signal,
              listener
            };
            options.signal.addEventListener("abort", listener, {
              once: true
            });
          }
          if (options?.asap) {
            __classPrivateFieldGet(this, _RedisCommandsQueue_waitingToBeSent, "f").unshiftNode(node);
          } else {
            __classPrivateFieldGet(this, _RedisCommandsQueue_waitingToBeSent, "f").pushNode(node);
          }
        });
      }
      subscribe(type, channels, listener, returnBuffers) {
        return __classPrivateFieldGet(this, _RedisCommandsQueue_instances, "m", _RedisCommandsQueue_pushPubSubCommand).call(this, __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").subscribe(type, channels, listener, returnBuffers));
      }
      unsubscribe(type, channels, listener, returnBuffers) {
        return __classPrivateFieldGet(this, _RedisCommandsQueue_instances, "m", _RedisCommandsQueue_pushPubSubCommand).call(this, __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").unsubscribe(type, channels, listener, returnBuffers));
      }
      resubscribe() {
        const commands = __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").resubscribe();
        if (!commands.length)
          return;
        return Promise.all(commands.map((command) => __classPrivateFieldGet(this, _RedisCommandsQueue_instances, "m", _RedisCommandsQueue_pushPubSubCommand).call(this, command)));
      }
      extendPubSubChannelListeners(type, channel, listeners) {
        return __classPrivateFieldGet(this, _RedisCommandsQueue_instances, "m", _RedisCommandsQueue_pushPubSubCommand).call(this, __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").extendChannelListeners(type, channel, listeners));
      }
      extendPubSubListeners(type, listeners) {
        return __classPrivateFieldGet(this, _RedisCommandsQueue_instances, "m", _RedisCommandsQueue_pushPubSubCommand).call(this, __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").extendTypeListeners(type, listeners));
      }
      getPubSubListeners(type) {
        return __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").getTypeListeners(type);
      }
      getCommandToSend() {
        const toSend = __classPrivateFieldGet(this, _RedisCommandsQueue_waitingToBeSent, "f").shift();
        if (!toSend)
          return;
        let encoded;
        try {
          encoded = (0, encoder_1.default)(toSend.args);
        } catch (err) {
          toSend.reject(err);
          return;
        }
        __classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f").push({
          resolve: toSend.resolve,
          reject: toSend.reject,
          channelsCounter: toSend.channelsCounter,
          returnBuffers: toSend.returnBuffers
        });
        __classPrivateFieldSet(this, _RedisCommandsQueue_chainInExecution, toSend.chainId, "f");
        return encoded;
      }
      onReplyChunk(chunk) {
        __classPrivateFieldGet(this, _RedisCommandsQueue_decoder, "f").write(chunk);
      }
      flushWaitingForReply(err) {
        __classPrivateFieldGet(this, _RedisCommandsQueue_decoder, "f").reset();
        __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").reset();
        __classPrivateFieldGet(_a, _a, "m", _RedisCommandsQueue_flushQueue).call(_a, __classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f"), err);
        if (!__classPrivateFieldGet(this, _RedisCommandsQueue_chainInExecution, "f"))
          return;
        while (__classPrivateFieldGet(this, _RedisCommandsQueue_waitingToBeSent, "f").head?.value.chainId === __classPrivateFieldGet(this, _RedisCommandsQueue_chainInExecution, "f")) {
          __classPrivateFieldGet(this, _RedisCommandsQueue_waitingToBeSent, "f").shift();
        }
        __classPrivateFieldSet(this, _RedisCommandsQueue_chainInExecution, void 0, "f");
      }
      flushAll(err) {
        __classPrivateFieldGet(this, _RedisCommandsQueue_decoder, "f").reset();
        __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").reset();
        __classPrivateFieldGet(_a, _a, "m", _RedisCommandsQueue_flushQueue).call(_a, __classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f"), err);
        __classPrivateFieldGet(_a, _a, "m", _RedisCommandsQueue_flushQueue).call(_a, __classPrivateFieldGet(this, _RedisCommandsQueue_waitingToBeSent, "f"), err);
      }
    };
    _a = RedisCommandsQueue, _RedisCommandsQueue_maxLength = /* @__PURE__ */ new WeakMap(), _RedisCommandsQueue_waitingToBeSent = /* @__PURE__ */ new WeakMap(), _RedisCommandsQueue_waitingForReply = /* @__PURE__ */ new WeakMap(), _RedisCommandsQueue_onShardedChannelMoved = /* @__PURE__ */ new WeakMap(), _RedisCommandsQueue_pubSub = /* @__PURE__ */ new WeakMap(), _RedisCommandsQueue_chainInExecution = /* @__PURE__ */ new WeakMap(), _RedisCommandsQueue_decoder = /* @__PURE__ */ new WeakMap(), _RedisCommandsQueue_instances = /* @__PURE__ */ new WeakSet(), _RedisCommandsQueue_flushQueue = function _RedisCommandsQueue_flushQueue2(queue, err) {
      while (queue.length) {
        queue.shift().reject(err);
      }
    }, _RedisCommandsQueue_pushPubSubCommand = function _RedisCommandsQueue_pushPubSubCommand2(command) {
      if (command === void 0)
        return;
      return new Promise((resolve, reject) => {
        __classPrivateFieldGet(this, _RedisCommandsQueue_waitingToBeSent, "f").push({
          args: command.args,
          channelsCounter: command.channelsCounter,
          returnBuffers: true,
          resolve: () => {
            command.resolve();
            resolve();
          },
          reject: (err) => {
            command.reject?.();
            reject(err);
          }
        });
      });
    };
    exports.default = RedisCommandsQueue;
  }
});

// node_modules/@redis/client/dist/lib/command-options.js
var require_command_options = __commonJS({
  "node_modules/@redis/client/dist/lib/command-options.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isCommandOptions = exports.commandOptions = void 0;
    var symbol = Symbol("Command Options");
    function commandOptions(options) {
      options[symbol] = true;
      return options;
    }
    exports.commandOptions = commandOptions;
    function isCommandOptions(options) {
      return options?.[symbol] === true;
    }
    exports.isCommandOptions = isCommandOptions;
  }
});

// node_modules/@redis/client/dist/lib/commander.js
var require_commander = __commonJS({
  "node_modules/@redis/client/dist/lib/commander.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.fCallArguments = exports.transformCommandReply = exports.transformLegacyCommandArguments = exports.transformCommandArguments = exports.attachExtensions = exports.attachCommands = void 0;
    var command_options_1 = require_command_options();
    function attachCommands({ BaseClass, commands, executor }) {
      for (const [name, command] of Object.entries(commands)) {
        BaseClass.prototype[name] = function(...args) {
          return executor.call(this, command, args, name);
        };
      }
    }
    exports.attachCommands = attachCommands;
    function attachExtensions(config) {
      let Commander;
      if (config.modules) {
        Commander = attachWithNamespaces({
          BaseClass: config.BaseClass,
          namespaces: config.modules,
          executor: config.modulesExecutor
        });
      }
      if (config.functions) {
        Commander = attachWithNamespaces({
          BaseClass: Commander ?? config.BaseClass,
          namespaces: config.functions,
          executor: config.functionsExecutor
        });
      }
      if (config.scripts) {
        Commander ?? (Commander = class extends config.BaseClass {
        });
        attachCommands({
          BaseClass: Commander,
          commands: config.scripts,
          executor: config.scriptsExecutor
        });
      }
      return Commander ?? config.BaseClass;
    }
    exports.attachExtensions = attachExtensions;
    function attachWithNamespaces({ BaseClass, namespaces, executor }) {
      const Commander = class extends BaseClass {
        constructor(...args) {
          super(...args);
          for (const namespace of Object.keys(namespaces)) {
            this[namespace] = Object.create(this[namespace], {
              self: {
                value: this
              }
            });
          }
        }
      };
      for (const [namespace, commands] of Object.entries(namespaces)) {
        Commander.prototype[namespace] = {};
        for (const [name, command] of Object.entries(commands)) {
          Commander.prototype[namespace][name] = function(...args) {
            return executor.call(this.self, command, args, name);
          };
        }
      }
      return Commander;
    }
    function transformCommandArguments(command, args) {
      let options;
      if ((0, command_options_1.isCommandOptions)(args[0])) {
        options = args[0];
        args = args.slice(1);
      }
      return {
        jsArgs: args,
        args: command.transformArguments(...args),
        options
      };
    }
    exports.transformCommandArguments = transformCommandArguments;
    function transformLegacyCommandArguments(args) {
      return args.flat().map((arg) => {
        return typeof arg === "number" || arg instanceof Date ? arg.toString() : arg;
      });
    }
    exports.transformLegacyCommandArguments = transformLegacyCommandArguments;
    function transformCommandReply(command, rawReply, preserved) {
      if (!command.transformReply) {
        return rawReply;
      }
      return command.transformReply(rawReply, preserved);
    }
    exports.transformCommandReply = transformCommandReply;
    function fCallArguments(name, fn, args) {
      const actualArgs = [
        fn.IS_READ_ONLY ? "FCALL_RO" : "FCALL",
        name
      ];
      if (fn.NUMBER_OF_KEYS !== void 0) {
        actualArgs.push(fn.NUMBER_OF_KEYS.toString());
      }
      actualArgs.push(...args);
      return actualArgs;
    }
    exports.fCallArguments = fCallArguments;
  }
});

// node_modules/@redis/client/dist/lib/multi-command.js
var require_multi_command = __commonJS({
  "node_modules/@redis/client/dist/lib/multi-command.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var commander_1 = require_commander();
    var errors_1 = require_errors();
    var RedisMultiCommand = class {
      constructor() {
        Object.defineProperty(this, "queue", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: []
        });
        Object.defineProperty(this, "scriptsInUse", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: /* @__PURE__ */ new Set()
        });
      }
      static generateChainId() {
        return Symbol("RedisMultiCommand Chain Id");
      }
      addCommand(args, transformReply) {
        this.queue.push({
          args,
          transformReply
        });
      }
      addFunction(name, fn, args) {
        const transformedArguments = (0, commander_1.fCallArguments)(name, fn, fn.transformArguments(...args));
        this.queue.push({
          args: transformedArguments,
          transformReply: fn.transformReply
        });
        return transformedArguments;
      }
      addScript(script, args) {
        const transformedArguments = [];
        if (this.scriptsInUse.has(script.SHA1)) {
          transformedArguments.push("EVALSHA", script.SHA1);
        } else {
          this.scriptsInUse.add(script.SHA1);
          transformedArguments.push("EVAL", script.SCRIPT);
        }
        if (script.NUMBER_OF_KEYS !== void 0) {
          transformedArguments.push(script.NUMBER_OF_KEYS.toString());
        }
        const scriptArguments = script.transformArguments(...args);
        transformedArguments.push(...scriptArguments);
        if (scriptArguments.preserve) {
          transformedArguments.preserve = scriptArguments.preserve;
        }
        this.addCommand(transformedArguments, script.transformReply);
        return transformedArguments;
      }
      handleExecReplies(rawReplies) {
        const execReply = rawReplies[rawReplies.length - 1];
        if (execReply === null) {
          throw new errors_1.WatchError();
        }
        return this.transformReplies(execReply);
      }
      transformReplies(rawReplies) {
        return rawReplies.map((reply, i) => {
          const { transformReply, args } = this.queue[i];
          return transformReply ? transformReply(reply, args.preserve) : reply;
        });
      }
    };
    exports.default = RedisMultiCommand;
  }
});

// node_modules/@redis/client/dist/lib/client/multi-command.js
var require_multi_command2 = __commonJS({
  "node_modules/@redis/client/dist/lib/client/multi-command.js"(exports) {
    "use strict";
    var __classPrivateFieldSet = exports && exports.__classPrivateFieldSet || function(receiver, state, value, kind, f) {
      if (kind === "m")
        throw new TypeError("Private method is not writable");
      if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a setter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot write private member to an object whose class did not declare it");
      return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
    };
    var __classPrivateFieldGet = exports && exports.__classPrivateFieldGet || function(receiver, state, kind, f) {
      if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a getter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot read private member from an object whose class did not declare it");
      return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    };
    var _RedisClientMultiCommand_instances;
    var _RedisClientMultiCommand_multi;
    var _RedisClientMultiCommand_executor;
    var _RedisClientMultiCommand_selectedDB;
    var _RedisClientMultiCommand_legacyMode;
    var _RedisClientMultiCommand_defineLegacyCommand;
    Object.defineProperty(exports, "__esModule", { value: true });
    var commands_1 = require_commands2();
    var multi_command_1 = require_multi_command();
    var commander_1 = require_commander();
    var RedisClientMultiCommand = class _RedisClientMultiCommand {
      static extend(extensions) {
        return (0, commander_1.attachExtensions)({
          BaseClass: _RedisClientMultiCommand,
          modulesExecutor: _RedisClientMultiCommand.prototype.commandsExecutor,
          modules: extensions?.modules,
          functionsExecutor: _RedisClientMultiCommand.prototype.functionsExecutor,
          functions: extensions?.functions,
          scriptsExecutor: _RedisClientMultiCommand.prototype.scriptsExecutor,
          scripts: extensions?.scripts
        });
      }
      constructor(executor, legacyMode = false) {
        _RedisClientMultiCommand_instances.add(this);
        _RedisClientMultiCommand_multi.set(this, new multi_command_1.default());
        _RedisClientMultiCommand_executor.set(this, void 0);
        Object.defineProperty(this, "v4", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: {}
        });
        _RedisClientMultiCommand_selectedDB.set(this, void 0);
        Object.defineProperty(this, "select", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.SELECT
        });
        Object.defineProperty(this, "EXEC", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.exec
        });
        __classPrivateFieldSet(this, _RedisClientMultiCommand_executor, executor, "f");
        if (legacyMode) {
          __classPrivateFieldGet(this, _RedisClientMultiCommand_instances, "m", _RedisClientMultiCommand_legacyMode).call(this);
        }
      }
      commandsExecutor(command, args) {
        return this.addCommand(command.transformArguments(...args), command.transformReply);
      }
      SELECT(db, transformReply) {
        __classPrivateFieldSet(this, _RedisClientMultiCommand_selectedDB, db, "f");
        return this.addCommand(["SELECT", db.toString()], transformReply);
      }
      addCommand(args, transformReply) {
        __classPrivateFieldGet(this, _RedisClientMultiCommand_multi, "f").addCommand(args, transformReply);
        return this;
      }
      functionsExecutor(fn, args, name) {
        __classPrivateFieldGet(this, _RedisClientMultiCommand_multi, "f").addFunction(name, fn, args);
        return this;
      }
      scriptsExecutor(script, args) {
        __classPrivateFieldGet(this, _RedisClientMultiCommand_multi, "f").addScript(script, args);
        return this;
      }
      async exec(execAsPipeline = false) {
        if (execAsPipeline) {
          return this.execAsPipeline();
        }
        return __classPrivateFieldGet(this, _RedisClientMultiCommand_multi, "f").handleExecReplies(await __classPrivateFieldGet(this, _RedisClientMultiCommand_executor, "f").call(this, __classPrivateFieldGet(this, _RedisClientMultiCommand_multi, "f").queue, __classPrivateFieldGet(this, _RedisClientMultiCommand_selectedDB, "f"), multi_command_1.default.generateChainId()));
      }
      async execAsPipeline() {
        if (__classPrivateFieldGet(this, _RedisClientMultiCommand_multi, "f").queue.length === 0)
          return [];
        return __classPrivateFieldGet(this, _RedisClientMultiCommand_multi, "f").transformReplies(await __classPrivateFieldGet(this, _RedisClientMultiCommand_executor, "f").call(this, __classPrivateFieldGet(this, _RedisClientMultiCommand_multi, "f").queue, __classPrivateFieldGet(this, _RedisClientMultiCommand_selectedDB, "f")));
      }
    };
    _RedisClientMultiCommand_multi = /* @__PURE__ */ new WeakMap(), _RedisClientMultiCommand_executor = /* @__PURE__ */ new WeakMap(), _RedisClientMultiCommand_selectedDB = /* @__PURE__ */ new WeakMap(), _RedisClientMultiCommand_instances = /* @__PURE__ */ new WeakSet(), _RedisClientMultiCommand_legacyMode = function _RedisClientMultiCommand_legacyMode2() {
      var _a, _b;
      this.v4.addCommand = this.addCommand.bind(this);
      this.addCommand = (...args) => {
        __classPrivateFieldGet(this, _RedisClientMultiCommand_multi, "f").addCommand((0, commander_1.transformLegacyCommandArguments)(args));
        return this;
      };
      this.v4.exec = this.exec.bind(this);
      this.exec = (callback) => {
        this.v4.exec().then((reply) => {
          if (!callback)
            return;
          callback(null, reply);
        }).catch((err) => {
          if (!callback) {
            return;
          }
          callback(err);
        });
      };
      for (const [name, command] of Object.entries(commands_1.default)) {
        __classPrivateFieldGet(this, _RedisClientMultiCommand_instances, "m", _RedisClientMultiCommand_defineLegacyCommand).call(this, name, command);
        (_a = this)[_b = name.toLowerCase()] ?? (_a[_b] = this[name]);
      }
    }, _RedisClientMultiCommand_defineLegacyCommand = function _RedisClientMultiCommand_defineLegacyCommand2(name, command) {
      this.v4[name] = this[name].bind(this.v4);
      this[name] = command && command.TRANSFORM_LEGACY_REPLY && command.transformReply ? (...args) => {
        __classPrivateFieldGet(this, _RedisClientMultiCommand_multi, "f").addCommand([name, ...(0, commander_1.transformLegacyCommandArguments)(args)], command.transformReply);
        return this;
      } : (...args) => this.addCommand(name, ...args);
    };
    exports.default = RedisClientMultiCommand;
    (0, commander_1.attachCommands)({
      BaseClass: RedisClientMultiCommand,
      commands: commands_1.default,
      executor: RedisClientMultiCommand.prototype.commandsExecutor
    });
  }
});

// node_modules/generic-pool/lib/factoryValidator.js
var require_factoryValidator = __commonJS({
  "node_modules/generic-pool/lib/factoryValidator.js"(exports, module2) {
    module2.exports = function(factory) {
      if (typeof factory.create !== "function") {
        throw new TypeError("factory.create must be a function");
      }
      if (typeof factory.destroy !== "function") {
        throw new TypeError("factory.destroy must be a function");
      }
      if (typeof factory.validate !== "undefined" && typeof factory.validate !== "function") {
        throw new TypeError("factory.validate must be a function");
      }
    };
  }
});

// node_modules/generic-pool/lib/PoolDefaults.js
var require_PoolDefaults = __commonJS({
  "node_modules/generic-pool/lib/PoolDefaults.js"(exports, module2) {
    "use strict";
    var PoolDefaults = class {
      constructor() {
        this.fifo = true;
        this.priorityRange = 1;
        this.testOnBorrow = false;
        this.testOnReturn = false;
        this.autostart = true;
        this.evictionRunIntervalMillis = 0;
        this.numTestsPerEvictionRun = 3;
        this.softIdleTimeoutMillis = -1;
        this.idleTimeoutMillis = 3e4;
        this.acquireTimeoutMillis = null;
        this.destroyTimeoutMillis = null;
        this.maxWaitingClients = null;
        this.min = null;
        this.max = null;
        this.Promise = Promise;
      }
    };
    module2.exports = PoolDefaults;
  }
});

// node_modules/generic-pool/lib/PoolOptions.js
var require_PoolOptions = __commonJS({
  "node_modules/generic-pool/lib/PoolOptions.js"(exports, module2) {
    "use strict";
    var PoolDefaults = require_PoolDefaults();
    var PoolOptions = class {
      /**
       * @param {Object} opts
       *   configuration for the pool
       * @param {Number} [opts.max=null]
       *   Maximum number of items that can exist at the same time.  Default: 1.
       *   Any further acquire requests will be pushed to the waiting list.
       * @param {Number} [opts.min=null]
       *   Minimum number of items in pool (including in-use). Default: 0.
       *   When the pool is created, or a resource destroyed, this minimum will
       *   be checked. If the pool resource count is below the minimum, a new
       *   resource will be created and added to the pool.
       * @param {Number} [opts.maxWaitingClients=null]
       *   maximum number of queued requests allowed after which acquire calls will be rejected
       * @param {Boolean} [opts.testOnBorrow=false]
       *   should the pool validate resources before giving them to clients. Requires that
       *   `factory.validate` is specified.
       * @param {Boolean} [opts.testOnReturn=false]
       *   should the pool validate resources before returning them to the pool.
       * @param {Number} [opts.acquireTimeoutMillis=null]
       *   Delay in milliseconds after which the an `acquire` call will fail. optional.
       *   Default: undefined. Should be positive and non-zero
       * @param {Number} [opts.destroyTimeoutMillis=null]
       *   Delay in milliseconds after which the an `destroy` call will fail, causing it to emit a factoryDestroyError event. optional.
       *   Default: undefined. Should be positive and non-zero
       * @param {Number} [opts.priorityRange=1]
       *   The range from 1 to be treated as a valid priority
       * @param {Boolean} [opts.fifo=true]
       *   Sets whether the pool has LIFO (last in, first out) behaviour with respect to idle objects.
       *   if false then pool has FIFO behaviour
       * @param {Boolean} [opts.autostart=true]
       *   Should the pool start creating resources etc once the constructor is called
       * @param {Number} [opts.evictionRunIntervalMillis=0]
       *   How often to run eviction checks.  Default: 0 (does not run).
       * @param {Number} [opts.numTestsPerEvictionRun=3]
       *   Number of resources to check each eviction run.  Default: 3.
       * @param {Number} [opts.softIdleTimeoutMillis=-1]
       *   amount of time an object may sit idle in the pool before it is eligible
       *   for eviction by the idle object evictor (if any), with the extra condition
       *   that at least "min idle" object instances remain in the pool. Default -1 (nothing can get evicted)
       * @param {Number} [opts.idleTimeoutMillis=30000]
       *   the minimum amount of time that an object may sit idle in the pool before it is eligible for eviction
       *   due to idle time. Supercedes "softIdleTimeoutMillis" Default: 30000
       * @param {typeof Promise} [opts.Promise=Promise]
       *   What promise implementation should the pool use, defaults to native promises.
       */
      constructor(opts) {
        const poolDefaults = new PoolDefaults();
        opts = opts || {};
        this.fifo = typeof opts.fifo === "boolean" ? opts.fifo : poolDefaults.fifo;
        this.priorityRange = opts.priorityRange || poolDefaults.priorityRange;
        this.testOnBorrow = typeof opts.testOnBorrow === "boolean" ? opts.testOnBorrow : poolDefaults.testOnBorrow;
        this.testOnReturn = typeof opts.testOnReturn === "boolean" ? opts.testOnReturn : poolDefaults.testOnReturn;
        this.autostart = typeof opts.autostart === "boolean" ? opts.autostart : poolDefaults.autostart;
        if (opts.acquireTimeoutMillis) {
          this.acquireTimeoutMillis = parseInt(opts.acquireTimeoutMillis, 10);
        }
        if (opts.destroyTimeoutMillis) {
          this.destroyTimeoutMillis = parseInt(opts.destroyTimeoutMillis, 10);
        }
        if (opts.maxWaitingClients !== void 0) {
          this.maxWaitingClients = parseInt(opts.maxWaitingClients, 10);
        }
        this.max = parseInt(opts.max, 10);
        this.min = parseInt(opts.min, 10);
        this.max = Math.max(isNaN(this.max) ? 1 : this.max, 1);
        this.min = Math.min(isNaN(this.min) ? 0 : this.min, this.max);
        this.evictionRunIntervalMillis = opts.evictionRunIntervalMillis || poolDefaults.evictionRunIntervalMillis;
        this.numTestsPerEvictionRun = opts.numTestsPerEvictionRun || poolDefaults.numTestsPerEvictionRun;
        this.softIdleTimeoutMillis = opts.softIdleTimeoutMillis || poolDefaults.softIdleTimeoutMillis;
        this.idleTimeoutMillis = opts.idleTimeoutMillis || poolDefaults.idleTimeoutMillis;
        this.Promise = opts.Promise != null ? opts.Promise : poolDefaults.Promise;
      }
    };
    module2.exports = PoolOptions;
  }
});

// node_modules/generic-pool/lib/Deferred.js
var require_Deferred = __commonJS({
  "node_modules/generic-pool/lib/Deferred.js"(exports, module2) {
    "use strict";
    var Deferred = class _Deferred {
      constructor(Promise2) {
        this._state = _Deferred.PENDING;
        this._resolve = void 0;
        this._reject = void 0;
        this._promise = new Promise2((resolve, reject) => {
          this._resolve = resolve;
          this._reject = reject;
        });
      }
      get state() {
        return this._state;
      }
      get promise() {
        return this._promise;
      }
      reject(reason) {
        if (this._state !== _Deferred.PENDING) {
          return;
        }
        this._state = _Deferred.REJECTED;
        this._reject(reason);
      }
      resolve(value) {
        if (this._state !== _Deferred.PENDING) {
          return;
        }
        this._state = _Deferred.FULFILLED;
        this._resolve(value);
      }
    };
    Deferred.PENDING = "PENDING";
    Deferred.FULFILLED = "FULFILLED";
    Deferred.REJECTED = "REJECTED";
    module2.exports = Deferred;
  }
});

// node_modules/generic-pool/lib/errors.js
var require_errors2 = __commonJS({
  "node_modules/generic-pool/lib/errors.js"(exports, module2) {
    "use strict";
    var ExtendableError = class extends Error {
      constructor(message) {
        super(message);
        this.name = this.constructor.name;
        this.message = message;
        if (typeof Error.captureStackTrace === "function") {
          Error.captureStackTrace(this, this.constructor);
        } else {
          this.stack = new Error(message).stack;
        }
      }
    };
    var TimeoutError = class extends ExtendableError {
      constructor(m) {
        super(m);
      }
    };
    module2.exports = {
      TimeoutError
    };
  }
});

// node_modules/generic-pool/lib/ResourceRequest.js
var require_ResourceRequest = __commonJS({
  "node_modules/generic-pool/lib/ResourceRequest.js"(exports, module2) {
    "use strict";
    var Deferred = require_Deferred();
    var errors = require_errors2();
    function fbind(fn, ctx) {
      return function bound() {
        return fn.apply(ctx, arguments);
      };
    }
    var ResourceRequest = class _ResourceRequest extends Deferred {
      /**
       * [constructor description]
       * @param  {Number} ttl     timeout
       */
      constructor(ttl, Promise2) {
        super(Promise2);
        this._creationTimestamp = Date.now();
        this._timeout = null;
        if (ttl !== void 0) {
          this.setTimeout(ttl);
        }
      }
      setTimeout(delay) {
        if (this._state !== _ResourceRequest.PENDING) {
          return;
        }
        const ttl = parseInt(delay, 10);
        if (isNaN(ttl) || ttl <= 0) {
          throw new Error("delay must be a positive int");
        }
        const age = Date.now() - this._creationTimestamp;
        if (this._timeout) {
          this.removeTimeout();
        }
        this._timeout = setTimeout(
          fbind(this._fireTimeout, this),
          Math.max(ttl - age, 0)
        );
      }
      removeTimeout() {
        if (this._timeout) {
          clearTimeout(this._timeout);
        }
        this._timeout = null;
      }
      _fireTimeout() {
        this.reject(new errors.TimeoutError("ResourceRequest timed out"));
      }
      reject(reason) {
        this.removeTimeout();
        super.reject(reason);
      }
      resolve(value) {
        this.removeTimeout();
        super.resolve(value);
      }
    };
    module2.exports = ResourceRequest;
  }
});

// node_modules/generic-pool/lib/ResourceLoan.js
var require_ResourceLoan = __commonJS({
  "node_modules/generic-pool/lib/ResourceLoan.js"(exports, module2) {
    "use strict";
    var Deferred = require_Deferred();
    var ResourceLoan = class extends Deferred {
      /**
       *
       * @param  {any} pooledResource the PooledResource this loan belongs to
       * @return {any}                [description]
       */
      constructor(pooledResource, Promise2) {
        super(Promise2);
        this._creationTimestamp = Date.now();
        this.pooledResource = pooledResource;
      }
      reject() {
      }
    };
    module2.exports = ResourceLoan;
  }
});

// node_modules/generic-pool/lib/PooledResourceStateEnum.js
var require_PooledResourceStateEnum = __commonJS({
  "node_modules/generic-pool/lib/PooledResourceStateEnum.js"(exports, module2) {
    "use strict";
    var PooledResourceStateEnum = {
      ALLOCATED: "ALLOCATED",
      // In use
      IDLE: "IDLE",
      // In the queue, not in use.
      INVALID: "INVALID",
      // Failed validation
      RETURNING: "RETURNING",
      // Resource is in process of returning
      VALIDATION: "VALIDATION"
      // Currently being tested
    };
    module2.exports = PooledResourceStateEnum;
  }
});

// node_modules/generic-pool/lib/PooledResource.js
var require_PooledResource = __commonJS({
  "node_modules/generic-pool/lib/PooledResource.js"(exports, module2) {
    "use strict";
    var PooledResourceStateEnum = require_PooledResourceStateEnum();
    var PooledResource = class {
      constructor(resource) {
        this.creationTime = Date.now();
        this.lastReturnTime = null;
        this.lastBorrowTime = null;
        this.lastIdleTime = null;
        this.obj = resource;
        this.state = PooledResourceStateEnum.IDLE;
      }
      // mark the resource as "allocated"
      allocate() {
        this.lastBorrowTime = Date.now();
        this.state = PooledResourceStateEnum.ALLOCATED;
      }
      // mark the resource as "deallocated"
      deallocate() {
        this.lastReturnTime = Date.now();
        this.state = PooledResourceStateEnum.IDLE;
      }
      invalidate() {
        this.state = PooledResourceStateEnum.INVALID;
      }
      test() {
        this.state = PooledResourceStateEnum.VALIDATION;
      }
      idle() {
        this.lastIdleTime = Date.now();
        this.state = PooledResourceStateEnum.IDLE;
      }
      returning() {
        this.state = PooledResourceStateEnum.RETURNING;
      }
    };
    module2.exports = PooledResource;
  }
});

// node_modules/generic-pool/lib/DefaultEvictor.js
var require_DefaultEvictor = __commonJS({
  "node_modules/generic-pool/lib/DefaultEvictor.js"(exports, module2) {
    "use strict";
    var DefaultEvictor = class {
      evict(config, pooledResource, availableObjectsCount) {
        const idleTime = Date.now() - pooledResource.lastIdleTime;
        if (config.softIdleTimeoutMillis > 0 && config.softIdleTimeoutMillis < idleTime && config.min < availableObjectsCount) {
          return true;
        }
        if (config.idleTimeoutMillis < idleTime) {
          return true;
        }
        return false;
      }
    };
    module2.exports = DefaultEvictor;
  }
});

// node_modules/generic-pool/lib/DoublyLinkedList.js
var require_DoublyLinkedList = __commonJS({
  "node_modules/generic-pool/lib/DoublyLinkedList.js"(exports, module2) {
    "use strict";
    var DoublyLinkedList = class {
      constructor() {
        this.head = null;
        this.tail = null;
        this.length = 0;
      }
      insertBeginning(node) {
        if (this.head === null) {
          this.head = node;
          this.tail = node;
          node.prev = null;
          node.next = null;
          this.length++;
        } else {
          this.insertBefore(this.head, node);
        }
      }
      insertEnd(node) {
        if (this.tail === null) {
          this.insertBeginning(node);
        } else {
          this.insertAfter(this.tail, node);
        }
      }
      insertAfter(node, newNode) {
        newNode.prev = node;
        newNode.next = node.next;
        if (node.next === null) {
          this.tail = newNode;
        } else {
          node.next.prev = newNode;
        }
        node.next = newNode;
        this.length++;
      }
      insertBefore(node, newNode) {
        newNode.prev = node.prev;
        newNode.next = node;
        if (node.prev === null) {
          this.head = newNode;
        } else {
          node.prev.next = newNode;
        }
        node.prev = newNode;
        this.length++;
      }
      remove(node) {
        if (node.prev === null) {
          this.head = node.next;
        } else {
          node.prev.next = node.next;
        }
        if (node.next === null) {
          this.tail = node.prev;
        } else {
          node.next.prev = node.prev;
        }
        node.prev = null;
        node.next = null;
        this.length--;
      }
      // FIXME: this should not live here and has become a dumping ground...
      static createNode(data) {
        return {
          prev: null,
          next: null,
          data
        };
      }
    };
    module2.exports = DoublyLinkedList;
  }
});

// node_modules/generic-pool/lib/DoublyLinkedListIterator.js
var require_DoublyLinkedListIterator = __commonJS({
  "node_modules/generic-pool/lib/DoublyLinkedListIterator.js"(exports, module2) {
    "use strict";
    var DoublyLinkedListIterator = class {
      /**
       * @param  {Object} doublyLinkedList     a node that is part of a doublyLinkedList
       * @param  {Boolean} [reverse=false]     is this a reverse iterator? default: false
       */
      constructor(doublyLinkedList, reverse) {
        this._list = doublyLinkedList;
        this._direction = reverse === true ? "prev" : "next";
        this._startPosition = reverse === true ? "tail" : "head";
        this._started = false;
        this._cursor = null;
        this._done = false;
      }
      _start() {
        this._cursor = this._list[this._startPosition];
        this._started = true;
      }
      _advanceCursor() {
        if (this._started === false) {
          this._started = true;
          this._cursor = this._list[this._startPosition];
          return;
        }
        this._cursor = this._cursor[this._direction];
      }
      reset() {
        this._done = false;
        this._started = false;
        this._cursor = null;
      }
      remove() {
        if (this._started === false || this._done === true || this._isCursorDetached()) {
          return false;
        }
        this._list.remove(this._cursor);
      }
      next() {
        if (this._done === true) {
          return { done: true };
        }
        this._advanceCursor();
        if (this._cursor === null || this._isCursorDetached()) {
          this._done = true;
          return { done: true };
        }
        return {
          value: this._cursor,
          done: false
        };
      }
      /**
       * Is the node detached from a list?
       * NOTE: you can trick/bypass/confuse this check by removing a node from one DoublyLinkedList
       * and adding it to another.
       * TODO: We can make this smarter by checking the direction of travel and only checking
       * the required next/prev/head/tail rather than all of them
       * @return {Boolean}      [description]
       */
      _isCursorDetached() {
        return this._cursor.prev === null && this._cursor.next === null && this._list.tail !== this._cursor && this._list.head !== this._cursor;
      }
    };
    module2.exports = DoublyLinkedListIterator;
  }
});

// node_modules/generic-pool/lib/DequeIterator.js
var require_DequeIterator = __commonJS({
  "node_modules/generic-pool/lib/DequeIterator.js"(exports, module2) {
    "use strict";
    var DoublyLinkedListIterator = require_DoublyLinkedListIterator();
    var DequeIterator = class extends DoublyLinkedListIterator {
      next() {
        const result = super.next();
        if (result.value) {
          result.value = result.value.data;
        }
        return result;
      }
    };
    module2.exports = DequeIterator;
  }
});

// node_modules/generic-pool/lib/Deque.js
var require_Deque = __commonJS({
  "node_modules/generic-pool/lib/Deque.js"(exports, module2) {
    "use strict";
    var DoublyLinkedList = require_DoublyLinkedList();
    var DequeIterator = require_DequeIterator();
    var Deque = class {
      constructor() {
        this._list = new DoublyLinkedList();
      }
      /**
       * removes and returns the first element from the queue
       * @return {any} [description]
       */
      shift() {
        if (this.length === 0) {
          return void 0;
        }
        const node = this._list.head;
        this._list.remove(node);
        return node.data;
      }
      /**
       * adds one elemts to the beginning of the queue
       * @param  {any} element [description]
       * @return {any}         [description]
       */
      unshift(element) {
        const node = DoublyLinkedList.createNode(element);
        this._list.insertBeginning(node);
      }
      /**
       * adds one to the end of the queue
       * @param  {any} element [description]
       * @return {any}         [description]
       */
      push(element) {
        const node = DoublyLinkedList.createNode(element);
        this._list.insertEnd(node);
      }
      /**
       * removes and returns the last element from the queue
       */
      pop() {
        if (this.length === 0) {
          return void 0;
        }
        const node = this._list.tail;
        this._list.remove(node);
        return node.data;
      }
      [Symbol.iterator]() {
        return new DequeIterator(this._list);
      }
      iterator() {
        return new DequeIterator(this._list);
      }
      reverseIterator() {
        return new DequeIterator(this._list, true);
      }
      /**
       * get a reference to the item at the head of the queue
       * @return {any} [description]
       */
      get head() {
        if (this.length === 0) {
          return void 0;
        }
        const node = this._list.head;
        return node.data;
      }
      /**
       * get a reference to the item at the tail of the queue
       * @return {any} [description]
       */
      get tail() {
        if (this.length === 0) {
          return void 0;
        }
        const node = this._list.tail;
        return node.data;
      }
      get length() {
        return this._list.length;
      }
    };
    module2.exports = Deque;
  }
});

// node_modules/generic-pool/lib/Queue.js
var require_Queue = __commonJS({
  "node_modules/generic-pool/lib/Queue.js"(exports, module2) {
    "use strict";
    var DoublyLinkedList = require_DoublyLinkedList();
    var Deque = require_Deque();
    var Queue = class extends Deque {
      /**
       * Adds the obj to the end of the list for this slot
       * we completely override the parent method because we need access to the
       * node for our rejection handler
       * @param {any} resourceRequest [description]
       */
      push(resourceRequest) {
        const node = DoublyLinkedList.createNode(resourceRequest);
        resourceRequest.promise.catch(this._createTimeoutRejectionHandler(node));
        this._list.insertEnd(node);
      }
      _createTimeoutRejectionHandler(node) {
        return (reason) => {
          if (reason.name === "TimeoutError") {
            this._list.remove(node);
          }
        };
      }
    };
    module2.exports = Queue;
  }
});

// node_modules/generic-pool/lib/PriorityQueue.js
var require_PriorityQueue = __commonJS({
  "node_modules/generic-pool/lib/PriorityQueue.js"(exports, module2) {
    "use strict";
    var Queue = require_Queue();
    var PriorityQueue = class {
      constructor(size) {
        this._size = Math.max(+size | 0, 1);
        this._slots = [];
        for (let i = 0; i < this._size; i++) {
          this._slots.push(new Queue());
        }
      }
      get length() {
        let _length = 0;
        for (let i = 0, slots = this._slots.length; i < slots; i++) {
          _length += this._slots[i].length;
        }
        return _length;
      }
      enqueue(obj, priority) {
        priority = priority && +priority | 0 || 0;
        if (priority) {
          if (priority < 0 || priority >= this._size) {
            priority = this._size - 1;
          }
        }
        this._slots[priority].push(obj);
      }
      dequeue() {
        for (let i = 0, sl = this._slots.length; i < sl; i += 1) {
          if (this._slots[i].length) {
            return this._slots[i].shift();
          }
        }
        return;
      }
      get head() {
        for (let i = 0, sl = this._slots.length; i < sl; i += 1) {
          if (this._slots[i].length > 0) {
            return this._slots[i].head;
          }
        }
        return;
      }
      get tail() {
        for (let i = this._slots.length - 1; i >= 0; i--) {
          if (this._slots[i].length > 0) {
            return this._slots[i].tail;
          }
        }
        return;
      }
    };
    module2.exports = PriorityQueue;
  }
});

// node_modules/generic-pool/lib/utils.js
var require_utils5 = __commonJS({
  "node_modules/generic-pool/lib/utils.js"(exports) {
    "use strict";
    function noop() {
    }
    exports.reflector = function(promise) {
      return promise.then(noop, noop);
    };
  }
});

// node_modules/generic-pool/lib/Pool.js
var require_Pool = __commonJS({
  "node_modules/generic-pool/lib/Pool.js"(exports, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var factoryValidator = require_factoryValidator();
    var PoolOptions = require_PoolOptions();
    var ResourceRequest = require_ResourceRequest();
    var ResourceLoan = require_ResourceLoan();
    var PooledResource = require_PooledResource();
    var DefaultEvictor = require_DefaultEvictor();
    var Deque = require_Deque();
    var Deferred = require_Deferred();
    var PriorityQueue = require_PriorityQueue();
    var DequeIterator = require_DequeIterator();
    var reflector = require_utils5().reflector;
    var FACTORY_CREATE_ERROR = "factoryCreateError";
    var FACTORY_DESTROY_ERROR = "factoryDestroyError";
    var Pool = class extends EventEmitter {
      /**
       * Generate an Object pool with a specified `factory` and `config`.
       *
       * @param {typeof DefaultEvictor} Evictor
       * @param {typeof Deque} Deque
       * @param {typeof PriorityQueue} PriorityQueue
       * @param {Object} factory
       *   Factory to be used for generating and destroying the items.
       * @param {Function} factory.create
       *   Should create the item to be acquired,
       *   and call it's first callback argument with the generated item as it's argument.
       * @param {Function} factory.destroy
       *   Should gently close any resources that the item is using.
       *   Called before the items is destroyed.
       * @param {Function} factory.validate
       *   Test if a resource is still valid .Should return a promise that resolves to a boolean, true if resource is still valid and false
       *   If it should be removed from pool.
       * @param {Object} options
       */
      constructor(Evictor, Deque2, PriorityQueue2, factory, options) {
        super();
        factoryValidator(factory);
        this._config = new PoolOptions(options);
        this._Promise = this._config.Promise;
        this._factory = factory;
        this._draining = false;
        this._started = false;
        this._waitingClientsQueue = new PriorityQueue2(this._config.priorityRange);
        this._factoryCreateOperations = /* @__PURE__ */ new Set();
        this._factoryDestroyOperations = /* @__PURE__ */ new Set();
        this._availableObjects = new Deque2();
        this._testOnBorrowResources = /* @__PURE__ */ new Set();
        this._testOnReturnResources = /* @__PURE__ */ new Set();
        this._validationOperations = /* @__PURE__ */ new Set();
        this._allObjects = /* @__PURE__ */ new Set();
        this._resourceLoans = /* @__PURE__ */ new Map();
        this._evictionIterator = this._availableObjects.iterator();
        this._evictor = new Evictor();
        this._scheduledEviction = null;
        if (this._config.autostart === true) {
          this.start();
        }
      }
      _destroy(pooledResource) {
        pooledResource.invalidate();
        this._allObjects.delete(pooledResource);
        const destroyPromise = this._factory.destroy(pooledResource.obj);
        const wrappedDestroyPromise = this._config.destroyTimeoutMillis ? this._Promise.resolve(this._applyDestroyTimeout(destroyPromise)) : this._Promise.resolve(destroyPromise);
        this._trackOperation(
          wrappedDestroyPromise,
          this._factoryDestroyOperations
        ).catch((reason) => {
          this.emit(FACTORY_DESTROY_ERROR, reason);
        });
        this._ensureMinimum();
      }
      _applyDestroyTimeout(promise) {
        const timeoutPromise = new this._Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error("destroy timed out"));
          }, this._config.destroyTimeoutMillis).unref();
        });
        return this._Promise.race([timeoutPromise, promise]);
      }
      /**
       * Attempt to move an available resource into test and then onto a waiting client
       * @return {Boolean} could we move an available resource into test
       */
      _testOnBorrow() {
        if (this._availableObjects.length < 1) {
          return false;
        }
        const pooledResource = this._availableObjects.shift();
        pooledResource.test();
        this._testOnBorrowResources.add(pooledResource);
        const validationPromise = this._factory.validate(pooledResource.obj);
        const wrappedValidationPromise = this._Promise.resolve(validationPromise);
        this._trackOperation(
          wrappedValidationPromise,
          this._validationOperations
        ).then((isValid) => {
          this._testOnBorrowResources.delete(pooledResource);
          if (isValid === false) {
            pooledResource.invalidate();
            this._destroy(pooledResource);
            this._dispense();
            return;
          }
          this._dispatchPooledResourceToNextWaitingClient(pooledResource);
        });
        return true;
      }
      /**
       * Attempt to move an available resource to a waiting client
       * @return {Boolean} [description]
       */
      _dispatchResource() {
        if (this._availableObjects.length < 1) {
          return false;
        }
        const pooledResource = this._availableObjects.shift();
        this._dispatchPooledResourceToNextWaitingClient(pooledResource);
        return false;
      }
      /**
       * Attempt to resolve an outstanding resource request using an available resource from
       * the pool, or creating new ones
       *
       * @private
       */
      _dispense() {
        const numWaitingClients = this._waitingClientsQueue.length;
        if (numWaitingClients < 1) {
          return;
        }
        const resourceShortfall = numWaitingClients - this._potentiallyAllocableResourceCount;
        const actualNumberOfResourcesToCreate = Math.min(
          this.spareResourceCapacity,
          resourceShortfall
        );
        for (let i = 0; actualNumberOfResourcesToCreate > i; i++) {
          this._createResource();
        }
        if (this._config.testOnBorrow === true) {
          const desiredNumberOfResourcesToMoveIntoTest = numWaitingClients - this._testOnBorrowResources.size;
          const actualNumberOfResourcesToMoveIntoTest = Math.min(
            this._availableObjects.length,
            desiredNumberOfResourcesToMoveIntoTest
          );
          for (let i = 0; actualNumberOfResourcesToMoveIntoTest > i; i++) {
            this._testOnBorrow();
          }
        }
        if (this._config.testOnBorrow === false) {
          const actualNumberOfResourcesToDispatch = Math.min(
            this._availableObjects.length,
            numWaitingClients
          );
          for (let i = 0; actualNumberOfResourcesToDispatch > i; i++) {
            this._dispatchResource();
          }
        }
      }
      /**
       * Dispatches a pooledResource to the next waiting client (if any) else
       * puts the PooledResource back on the available list
       * @param  {PooledResource} pooledResource [description]
       * @return {Boolean}                [description]
       */
      _dispatchPooledResourceToNextWaitingClient(pooledResource) {
        const clientResourceRequest = this._waitingClientsQueue.dequeue();
        if (clientResourceRequest === void 0 || clientResourceRequest.state !== Deferred.PENDING) {
          this._addPooledResourceToAvailableObjects(pooledResource);
          return false;
        }
        const loan = new ResourceLoan(pooledResource, this._Promise);
        this._resourceLoans.set(pooledResource.obj, loan);
        pooledResource.allocate();
        clientResourceRequest.resolve(pooledResource.obj);
        return true;
      }
      /**
       * tracks on operation using given set
       * handles adding/removing from the set and resolve/rejects the value/reason
       * @param  {Promise} operation
       * @param  {Set} set       Set holding operations
       * @return {Promise}       Promise that resolves once operation has been removed from set
       */
      _trackOperation(operation, set) {
        set.add(operation);
        return operation.then(
          (v) => {
            set.delete(operation);
            return this._Promise.resolve(v);
          },
          (e) => {
            set.delete(operation);
            return this._Promise.reject(e);
          }
        );
      }
      /**
       * @private
       */
      _createResource() {
        const factoryPromise = this._factory.create();
        const wrappedFactoryPromise = this._Promise.resolve(factoryPromise).then((resource) => {
          const pooledResource = new PooledResource(resource);
          this._allObjects.add(pooledResource);
          this._addPooledResourceToAvailableObjects(pooledResource);
        });
        this._trackOperation(wrappedFactoryPromise, this._factoryCreateOperations).then(() => {
          this._dispense();
          return null;
        }).catch((reason) => {
          this.emit(FACTORY_CREATE_ERROR, reason);
          this._dispense();
        });
      }
      /**
       * @private
       */
      _ensureMinimum() {
        if (this._draining === true) {
          return;
        }
        const minShortfall = this._config.min - this._count;
        for (let i = 0; i < minShortfall; i++) {
          this._createResource();
        }
      }
      _evict() {
        const testsToRun = Math.min(
          this._config.numTestsPerEvictionRun,
          this._availableObjects.length
        );
        const evictionConfig = {
          softIdleTimeoutMillis: this._config.softIdleTimeoutMillis,
          idleTimeoutMillis: this._config.idleTimeoutMillis,
          min: this._config.min
        };
        for (let testsHaveRun = 0; testsHaveRun < testsToRun; ) {
          const iterationResult = this._evictionIterator.next();
          if (iterationResult.done === true && this._availableObjects.length < 1) {
            this._evictionIterator.reset();
            return;
          }
          if (iterationResult.done === true && this._availableObjects.length > 0) {
            this._evictionIterator.reset();
            continue;
          }
          const resource = iterationResult.value;
          const shouldEvict = this._evictor.evict(
            evictionConfig,
            resource,
            this._availableObjects.length
          );
          testsHaveRun++;
          if (shouldEvict === true) {
            this._evictionIterator.remove();
            this._destroy(resource);
          }
        }
      }
      _scheduleEvictorRun() {
        if (this._config.evictionRunIntervalMillis > 0) {
          this._scheduledEviction = setTimeout(() => {
            this._evict();
            this._scheduleEvictorRun();
          }, this._config.evictionRunIntervalMillis).unref();
        }
      }
      _descheduleEvictorRun() {
        if (this._scheduledEviction) {
          clearTimeout(this._scheduledEviction);
        }
        this._scheduledEviction = null;
      }
      start() {
        if (this._draining === true) {
          return;
        }
        if (this._started === true) {
          return;
        }
        this._started = true;
        this._scheduleEvictorRun();
        this._ensureMinimum();
      }
      /**
       * Request a new resource. The callback will be called,
       * when a new resource is available, passing the resource to the callback.
       * TODO: should we add a seperate "acquireWithPriority" function
       *
       * @param {Number} [priority=0]
       *   Optional.  Integer between 0 and (priorityRange - 1).  Specifies the priority
       *   of the caller if there are no available resources.  Lower numbers mean higher
       *   priority.
       *
       * @returns {Promise}
       */
      acquire(priority) {
        if (this._started === false && this._config.autostart === false) {
          this.start();
        }
        if (this._draining) {
          return this._Promise.reject(
            new Error("pool is draining and cannot accept work")
          );
        }
        if (this.spareResourceCapacity < 1 && this._availableObjects.length < 1 && this._config.maxWaitingClients !== void 0 && this._waitingClientsQueue.length >= this._config.maxWaitingClients) {
          return this._Promise.reject(
            new Error("max waitingClients count exceeded")
          );
        }
        const resourceRequest = new ResourceRequest(
          this._config.acquireTimeoutMillis,
          this._Promise
        );
        this._waitingClientsQueue.enqueue(resourceRequest, priority);
        this._dispense();
        return resourceRequest.promise;
      }
      /**
       * [use method, aquires a resource, passes the resource to a user supplied function and releases it]
       * @param  {Function} fn [a function that accepts a resource and returns a promise that resolves/rejects once it has finished using the resource]
       * @return {Promise}      [resolves once the resource is released to the pool]
       */
      use(fn, priority) {
        return this.acquire(priority).then((resource) => {
          return fn(resource).then(
            (result) => {
              this.release(resource);
              return result;
            },
            (err) => {
              this.destroy(resource);
              throw err;
            }
          );
        });
      }
      /**
       * Check if resource is currently on loan from the pool
       *
       * @param {Function} resource
       *    Resource for checking.
       *
       * @returns {Boolean}
       *  True if resource belongs to this pool and false otherwise
       */
      isBorrowedResource(resource) {
        return this._resourceLoans.has(resource);
      }
      /**
       * Return the resource to the pool when it is no longer required.
       *
       * @param {Object} resource
       *   The acquired object to be put back to the pool.
       */
      release(resource) {
        const loan = this._resourceLoans.get(resource);
        if (loan === void 0) {
          return this._Promise.reject(
            new Error("Resource not currently part of this pool")
          );
        }
        this._resourceLoans.delete(resource);
        loan.resolve();
        const pooledResource = loan.pooledResource;
        pooledResource.deallocate();
        this._addPooledResourceToAvailableObjects(pooledResource);
        this._dispense();
        return this._Promise.resolve();
      }
      /**
       * Request the resource to be destroyed. The factory's destroy handler
       * will also be called.
       *
       * This should be called within an acquire() block as an alternative to release().
       *
       * @param {Object} resource
       *   The acquired resource to be destoyed.
       */
      destroy(resource) {
        const loan = this._resourceLoans.get(resource);
        if (loan === void 0) {
          return this._Promise.reject(
            new Error("Resource not currently part of this pool")
          );
        }
        this._resourceLoans.delete(resource);
        loan.resolve();
        const pooledResource = loan.pooledResource;
        pooledResource.deallocate();
        this._destroy(pooledResource);
        this._dispense();
        return this._Promise.resolve();
      }
      _addPooledResourceToAvailableObjects(pooledResource) {
        pooledResource.idle();
        if (this._config.fifo === true) {
          this._availableObjects.push(pooledResource);
        } else {
          this._availableObjects.unshift(pooledResource);
        }
      }
      /**
       * Disallow any new acquire calls and let the request backlog dissapate.
       * The Pool will no longer attempt to maintain a "min" number of resources
       * and will only make new resources on demand.
       * Resolves once all resource requests are fulfilled and all resources are returned to pool and available...
       * Should probably be called "drain work"
       * @returns {Promise}
       */
      drain() {
        this._draining = true;
        return this.__allResourceRequestsSettled().then(() => {
          return this.__allResourcesReturned();
        }).then(() => {
          this._descheduleEvictorRun();
        });
      }
      __allResourceRequestsSettled() {
        if (this._waitingClientsQueue.length > 0) {
          return reflector(this._waitingClientsQueue.tail.promise);
        }
        return this._Promise.resolve();
      }
      // FIXME: this is a horrific mess
      __allResourcesReturned() {
        const ps = Array.from(this._resourceLoans.values()).map((loan) => loan.promise).map(reflector);
        return this._Promise.all(ps);
      }
      /**
       * Forcibly destroys all available resources regardless of timeout.  Intended to be
       * invoked as part of a drain.  Does not prevent the creation of new
       * resources as a result of subsequent calls to acquire.
       *
       * Note that if factory.min > 0 and the pool isn't "draining", the pool will destroy all idle resources
       * in the pool, but replace them with newly created resources up to the
       * specified factory.min value.  If this is not desired, set factory.min
       * to zero before calling clear()
       *
       */
      clear() {
        const reflectedCreatePromises = Array.from(
          this._factoryCreateOperations
        ).map(reflector);
        return this._Promise.all(reflectedCreatePromises).then(() => {
          for (const resource of this._availableObjects) {
            this._destroy(resource);
          }
          const reflectedDestroyPromises = Array.from(
            this._factoryDestroyOperations
          ).map(reflector);
          return reflector(this._Promise.all(reflectedDestroyPromises));
        });
      }
      /**
       * Waits until the pool is ready.
       * We define ready by checking if the current resource number is at least
       * the minimum number defined.
       * @returns {Promise} that resolves when the minimum number is ready.
       */
      ready() {
        return new this._Promise((resolve) => {
          const isReady = () => {
            if (this.available >= this.min) {
              resolve();
            } else {
              setTimeout(isReady, 100);
            }
          };
          isReady();
        });
      }
      /**
       * How many resources are available to allocated
       * (includes resources that have not been tested and may faul validation)
       * NOTE: internal for now as the name is awful and might not be useful to anyone
       * @return {Number} number of resources the pool has to allocate
       */
      get _potentiallyAllocableResourceCount() {
        return this._availableObjects.length + this._testOnBorrowResources.size + this._testOnReturnResources.size + this._factoryCreateOperations.size;
      }
      /**
       * The combined count of the currently created objects and those in the
       * process of being created
       * Does NOT include resources in the process of being destroyed
       * sort of legacy...
       * @return {Number}
       */
      get _count() {
        return this._allObjects.size + this._factoryCreateOperations.size;
      }
      /**
       * How many more resources does the pool have room for
       * @return {Number} number of resources the pool could create before hitting any limits
       */
      get spareResourceCapacity() {
        return this._config.max - (this._allObjects.size + this._factoryCreateOperations.size);
      }
      /**
       * see _count above
       * @return {Number} [description]
       */
      get size() {
        return this._count;
      }
      /**
       * number of available resources
       * @return {Number} [description]
       */
      get available() {
        return this._availableObjects.length;
      }
      /**
       * number of resources that are currently acquired
       * @return {Number} [description]
       */
      get borrowed() {
        return this._resourceLoans.size;
      }
      /**
       * number of waiting acquire calls
       * @return {Number} [description]
       */
      get pending() {
        return this._waitingClientsQueue.length;
      }
      /**
       * maximum size of the pool
       * @return {Number} [description]
       */
      get max() {
        return this._config.max;
      }
      /**
       * minimum size of the pool
       * @return {Number} [description]
       */
      get min() {
        return this._config.min;
      }
    };
    module2.exports = Pool;
  }
});

// node_modules/generic-pool/index.js
var require_generic_pool = __commonJS({
  "node_modules/generic-pool/index.js"(exports, module2) {
    var Pool = require_Pool();
    var Deque = require_Deque();
    var PriorityQueue = require_PriorityQueue();
    var DefaultEvictor = require_DefaultEvictor();
    module2.exports = {
      Pool,
      Deque,
      PriorityQueue,
      DefaultEvictor,
      createPool: function(factory, config) {
        return new Pool(DefaultEvictor, Deque, PriorityQueue, factory, config);
      }
    };
  }
});

// node_modules/@redis/client/dist/lib/client/index.js
var require_client3 = __commonJS({
  "node_modules/@redis/client/dist/lib/client/index.js"(exports) {
    "use strict";
    var __classPrivateFieldGet = exports && exports.__classPrivateFieldGet || function(receiver, state, kind, f) {
      if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a getter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot read private member from an object whose class did not declare it");
      return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    };
    var __classPrivateFieldSet = exports && exports.__classPrivateFieldSet || function(receiver, state, value, kind, f) {
      if (kind === "m")
        throw new TypeError("Private method is not writable");
      if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a setter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot write private member to an object whose class did not declare it");
      return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
    };
    var _RedisClient_instances;
    var _a;
    var _RedisClient_options;
    var _RedisClient_socket;
    var _RedisClient_queue;
    var _RedisClient_isolationPool;
    var _RedisClient_v4;
    var _RedisClient_selectedDB;
    var _RedisClient_initiateOptions;
    var _RedisClient_initiateQueue;
    var _RedisClient_initiateSocket;
    var _RedisClient_initiateIsolationPool;
    var _RedisClient_legacyMode;
    var _RedisClient_legacySendCommand;
    var _RedisClient_defineLegacyCommand;
    var _RedisClient_pingTimer;
    var _RedisClient_setPingTimer;
    var _RedisClient_sendCommand;
    var _RedisClient_pubSubCommand;
    var _RedisClient_tick;
    var _RedisClient_addMultiCommands;
    var _RedisClient_destroyIsolationPool;
    Object.defineProperty(exports, "__esModule", { value: true });
    var commands_1 = require_commands2();
    var socket_1 = require_socket();
    var commands_queue_1 = require_commands_queue();
    var multi_command_1 = require_multi_command2();
    var events_1 = require("events");
    var command_options_1 = require_command_options();
    var commander_1 = require_commander();
    var generic_pool_1 = require_generic_pool();
    var errors_1 = require_errors();
    var url_1 = require("url");
    var pub_sub_1 = require_pub_sub();
    var RedisClient = class extends events_1.EventEmitter {
      static commandOptions(options) {
        return (0, command_options_1.commandOptions)(options);
      }
      static extend(extensions) {
        const Client = (0, commander_1.attachExtensions)({
          BaseClass: _a,
          modulesExecutor: _a.prototype.commandsExecutor,
          modules: extensions?.modules,
          functionsExecutor: _a.prototype.functionsExecuter,
          functions: extensions?.functions,
          scriptsExecutor: _a.prototype.scriptsExecuter,
          scripts: extensions?.scripts
        });
        if (Client !== _a) {
          Client.prototype.Multi = multi_command_1.default.extend(extensions);
        }
        return Client;
      }
      static create(options) {
        return new (_a.extend(options))(options);
      }
      static parseURL(url) {
        const { hostname, port, protocol, username, password, pathname } = new url_1.URL(url), parsed = {
          socket: {
            host: hostname
          }
        };
        if (protocol === "rediss:") {
          parsed.socket.tls = true;
        } else if (protocol !== "redis:") {
          throw new TypeError("Invalid protocol");
        }
        if (port) {
          parsed.socket.port = Number(port);
        }
        if (username) {
          parsed.username = decodeURIComponent(username);
        }
        if (password) {
          parsed.password = decodeURIComponent(password);
        }
        if (pathname.length > 1) {
          const database = Number(pathname.substring(1));
          if (isNaN(database)) {
            throw new TypeError("Invalid pathname");
          }
          parsed.database = database;
        }
        return parsed;
      }
      get options() {
        return __classPrivateFieldGet(this, _RedisClient_options, "f");
      }
      get isOpen() {
        return __classPrivateFieldGet(this, _RedisClient_socket, "f").isOpen;
      }
      get isReady() {
        return __classPrivateFieldGet(this, _RedisClient_socket, "f").isReady;
      }
      get isPubSubActive() {
        return __classPrivateFieldGet(this, _RedisClient_queue, "f").isPubSubActive;
      }
      get v4() {
        if (!__classPrivateFieldGet(this, _RedisClient_options, "f")?.legacyMode) {
          throw new Error('the client is not in "legacy mode"');
        }
        return __classPrivateFieldGet(this, _RedisClient_v4, "f");
      }
      constructor(options) {
        super();
        _RedisClient_instances.add(this);
        Object.defineProperty(this, "commandOptions", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _a.commandOptions
        });
        _RedisClient_options.set(this, void 0);
        _RedisClient_socket.set(this, void 0);
        _RedisClient_queue.set(this, void 0);
        _RedisClient_isolationPool.set(this, void 0);
        _RedisClient_v4.set(this, {});
        _RedisClient_selectedDB.set(this, 0);
        _RedisClient_pingTimer.set(this, void 0);
        Object.defineProperty(this, "select", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.SELECT
        });
        Object.defineProperty(this, "subscribe", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.SUBSCRIBE
        });
        Object.defineProperty(this, "unsubscribe", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.UNSUBSCRIBE
        });
        Object.defineProperty(this, "pSubscribe", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.PSUBSCRIBE
        });
        Object.defineProperty(this, "pUnsubscribe", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.PUNSUBSCRIBE
        });
        Object.defineProperty(this, "sSubscribe", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.SSUBSCRIBE
        });
        Object.defineProperty(this, "sUnsubscribe", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.SUNSUBSCRIBE
        });
        Object.defineProperty(this, "quit", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.QUIT
        });
        Object.defineProperty(this, "multi", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.MULTI
        });
        __classPrivateFieldSet(this, _RedisClient_options, __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_initiateOptions).call(this, options), "f");
        __classPrivateFieldSet(this, _RedisClient_queue, __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_initiateQueue).call(this), "f");
        __classPrivateFieldSet(this, _RedisClient_socket, __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_initiateSocket).call(this), "f");
        __classPrivateFieldSet(this, _RedisClient_isolationPool, __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_initiateIsolationPool).call(this), "f");
        __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_legacyMode).call(this);
      }
      duplicate(overrides) {
        return new (Object.getPrototypeOf(this)).constructor({
          ...__classPrivateFieldGet(this, _RedisClient_options, "f"),
          ...overrides
        });
      }
      async connect() {
        __classPrivateFieldSet(this, _RedisClient_isolationPool, __classPrivateFieldGet(this, _RedisClient_isolationPool, "f") ?? __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_initiateIsolationPool).call(this), "f");
        await __classPrivateFieldGet(this, _RedisClient_socket, "f").connect();
        return this;
      }
      async commandsExecutor(command, args) {
        const { args: redisArgs, options } = (0, commander_1.transformCommandArguments)(command, args);
        return (0, commander_1.transformCommandReply)(command, await __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_sendCommand).call(this, redisArgs, options), redisArgs.preserve);
      }
      sendCommand(args, options) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_sendCommand).call(this, args, options);
      }
      async functionsExecuter(fn, args, name) {
        const { args: redisArgs, options } = (0, commander_1.transformCommandArguments)(fn, args);
        return (0, commander_1.transformCommandReply)(fn, await this.executeFunction(name, fn, redisArgs, options), redisArgs.preserve);
      }
      executeFunction(name, fn, args, options) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_sendCommand).call(this, (0, commander_1.fCallArguments)(name, fn, args), options);
      }
      async scriptsExecuter(script, args) {
        const { args: redisArgs, options } = (0, commander_1.transformCommandArguments)(script, args);
        return (0, commander_1.transformCommandReply)(script, await this.executeScript(script, redisArgs, options), redisArgs.preserve);
      }
      async executeScript(script, args, options) {
        const redisArgs = ["EVALSHA", script.SHA1];
        if (script.NUMBER_OF_KEYS !== void 0) {
          redisArgs.push(script.NUMBER_OF_KEYS.toString());
        }
        redisArgs.push(...args);
        try {
          return await __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_sendCommand).call(this, redisArgs, options);
        } catch (err) {
          if (!err?.message?.startsWith?.("NOSCRIPT")) {
            throw err;
          }
          redisArgs[0] = "EVAL";
          redisArgs[1] = script.SCRIPT;
          return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_sendCommand).call(this, redisArgs, options);
        }
      }
      async SELECT(options, db) {
        if (!(0, command_options_1.isCommandOptions)(options)) {
          db = options;
          options = null;
        }
        await __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_sendCommand).call(this, ["SELECT", db.toString()], options);
        __classPrivateFieldSet(this, _RedisClient_selectedDB, db, "f");
      }
      SUBSCRIBE(channels, listener, bufferMode) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_pubSubCommand).call(this, __classPrivateFieldGet(this, _RedisClient_queue, "f").subscribe(pub_sub_1.PubSubType.CHANNELS, channels, listener, bufferMode));
      }
      UNSUBSCRIBE(channels, listener, bufferMode) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_pubSubCommand).call(this, __classPrivateFieldGet(this, _RedisClient_queue, "f").unsubscribe(pub_sub_1.PubSubType.CHANNELS, channels, listener, bufferMode));
      }
      PSUBSCRIBE(patterns, listener, bufferMode) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_pubSubCommand).call(this, __classPrivateFieldGet(this, _RedisClient_queue, "f").subscribe(pub_sub_1.PubSubType.PATTERNS, patterns, listener, bufferMode));
      }
      PUNSUBSCRIBE(patterns, listener, bufferMode) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_pubSubCommand).call(this, __classPrivateFieldGet(this, _RedisClient_queue, "f").unsubscribe(pub_sub_1.PubSubType.PATTERNS, patterns, listener, bufferMode));
      }
      SSUBSCRIBE(channels, listener, bufferMode) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_pubSubCommand).call(this, __classPrivateFieldGet(this, _RedisClient_queue, "f").subscribe(pub_sub_1.PubSubType.SHARDED, channels, listener, bufferMode));
      }
      SUNSUBSCRIBE(channels, listener, bufferMode) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_pubSubCommand).call(this, __classPrivateFieldGet(this, _RedisClient_queue, "f").unsubscribe(pub_sub_1.PubSubType.SHARDED, channels, listener, bufferMode));
      }
      getPubSubListeners(type) {
        return __classPrivateFieldGet(this, _RedisClient_queue, "f").getPubSubListeners(type);
      }
      extendPubSubChannelListeners(type, channel, listeners) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_pubSubCommand).call(this, __classPrivateFieldGet(this, _RedisClient_queue, "f").extendPubSubChannelListeners(type, channel, listeners));
      }
      extendPubSubListeners(type, listeners) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_pubSubCommand).call(this, __classPrivateFieldGet(this, _RedisClient_queue, "f").extendPubSubListeners(type, listeners));
      }
      QUIT() {
        return __classPrivateFieldGet(this, _RedisClient_socket, "f").quit(async () => {
          if (__classPrivateFieldGet(this, _RedisClient_pingTimer, "f"))
            clearTimeout(__classPrivateFieldGet(this, _RedisClient_pingTimer, "f"));
          const quitPromise = __classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(["QUIT"]);
          __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_tick).call(this);
          const [reply] = await Promise.all([
            quitPromise,
            __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_destroyIsolationPool).call(this)
          ]);
          return reply;
        });
      }
      executeIsolated(fn) {
        if (!__classPrivateFieldGet(this, _RedisClient_isolationPool, "f"))
          return Promise.reject(new errors_1.ClientClosedError());
        return __classPrivateFieldGet(this, _RedisClient_isolationPool, "f").use(fn);
      }
      MULTI() {
        return new this.Multi(this.multiExecutor.bind(this), __classPrivateFieldGet(this, _RedisClient_options, "f")?.legacyMode);
      }
      async multiExecutor(commands, selectedDB, chainId) {
        if (!__classPrivateFieldGet(this, _RedisClient_socket, "f").isOpen) {
          return Promise.reject(new errors_1.ClientClosedError());
        }
        const promise = chainId ? (
          // if `chainId` has a value, it's a `MULTI` (and not "pipeline") - need to add the `MULTI` and `EXEC` commands
          Promise.all([
            __classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(["MULTI"], { chainId }),
            __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_addMultiCommands).call(this, commands, chainId),
            __classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(["EXEC"], { chainId })
          ])
        ) : __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_addMultiCommands).call(this, commands);
        __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_tick).call(this);
        const results = await promise;
        if (selectedDB !== void 0) {
          __classPrivateFieldSet(this, _RedisClient_selectedDB, selectedDB, "f");
        }
        return results;
      }
      async *scanIterator(options) {
        let cursor = 0;
        do {
          const reply = await this.scan(cursor, options);
          cursor = reply.cursor;
          for (const key of reply.keys) {
            yield key;
          }
        } while (cursor !== 0);
      }
      async *hScanIterator(key, options) {
        let cursor = 0;
        do {
          const reply = await this.hScan(key, cursor, options);
          cursor = reply.cursor;
          for (const tuple of reply.tuples) {
            yield tuple;
          }
        } while (cursor !== 0);
      }
      async *sScanIterator(key, options) {
        let cursor = 0;
        do {
          const reply = await this.sScan(key, cursor, options);
          cursor = reply.cursor;
          for (const member of reply.members) {
            yield member;
          }
        } while (cursor !== 0);
      }
      async *zScanIterator(key, options) {
        let cursor = 0;
        do {
          const reply = await this.zScan(key, cursor, options);
          cursor = reply.cursor;
          for (const member of reply.members) {
            yield member;
          }
        } while (cursor !== 0);
      }
      async disconnect() {
        if (__classPrivateFieldGet(this, _RedisClient_pingTimer, "f"))
          clearTimeout(__classPrivateFieldGet(this, _RedisClient_pingTimer, "f"));
        __classPrivateFieldGet(this, _RedisClient_queue, "f").flushAll(new errors_1.DisconnectsClientError());
        __classPrivateFieldGet(this, _RedisClient_socket, "f").disconnect();
        await __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_destroyIsolationPool).call(this);
      }
      ref() {
        __classPrivateFieldGet(this, _RedisClient_socket, "f").ref();
      }
      unref() {
        __classPrivateFieldGet(this, _RedisClient_socket, "f").unref();
      }
    };
    _a = RedisClient, _RedisClient_options = /* @__PURE__ */ new WeakMap(), _RedisClient_socket = /* @__PURE__ */ new WeakMap(), _RedisClient_queue = /* @__PURE__ */ new WeakMap(), _RedisClient_isolationPool = /* @__PURE__ */ new WeakMap(), _RedisClient_v4 = /* @__PURE__ */ new WeakMap(), _RedisClient_selectedDB = /* @__PURE__ */ new WeakMap(), _RedisClient_pingTimer = /* @__PURE__ */ new WeakMap(), _RedisClient_instances = /* @__PURE__ */ new WeakSet(), _RedisClient_initiateOptions = function _RedisClient_initiateOptions2(options) {
      if (options?.url) {
        const parsed = _a.parseURL(options.url);
        if (options.socket) {
          parsed.socket = Object.assign(options.socket, parsed.socket);
        }
        Object.assign(options, parsed);
      }
      if (options?.database) {
        __classPrivateFieldSet(this, _RedisClient_selectedDB, options.database, "f");
      }
      return options;
    }, _RedisClient_initiateQueue = function _RedisClient_initiateQueue2() {
      return new commands_queue_1.default(__classPrivateFieldGet(this, _RedisClient_options, "f")?.commandsQueueMaxLength, (channel, listeners) => this.emit("sharded-channel-moved", channel, listeners));
    }, _RedisClient_initiateSocket = function _RedisClient_initiateSocket2() {
      const socketInitiator = async () => {
        const promises = [];
        if (__classPrivateFieldGet(this, _RedisClient_selectedDB, "f") !== 0) {
          promises.push(__classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(["SELECT", __classPrivateFieldGet(this, _RedisClient_selectedDB, "f").toString()], { asap: true }));
        }
        if (__classPrivateFieldGet(this, _RedisClient_options, "f")?.readonly) {
          promises.push(__classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(commands_1.default.READONLY.transformArguments(), { asap: true }));
        }
        if (__classPrivateFieldGet(this, _RedisClient_options, "f")?.name) {
          promises.push(__classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(commands_1.default.CLIENT_SETNAME.transformArguments(__classPrivateFieldGet(this, _RedisClient_options, "f").name), { asap: true }));
        }
        if (__classPrivateFieldGet(this, _RedisClient_options, "f")?.username || __classPrivateFieldGet(this, _RedisClient_options, "f")?.password) {
          promises.push(__classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(commands_1.default.AUTH.transformArguments({
            username: __classPrivateFieldGet(this, _RedisClient_options, "f").username,
            password: __classPrivateFieldGet(this, _RedisClient_options, "f").password ?? ""
          }), { asap: true }));
        }
        const resubscribePromise = __classPrivateFieldGet(this, _RedisClient_queue, "f").resubscribe();
        if (resubscribePromise) {
          promises.push(resubscribePromise);
        }
        if (promises.length) {
          __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_tick).call(this, true);
          await Promise.all(promises);
        }
      };
      return new socket_1.default(socketInitiator, __classPrivateFieldGet(this, _RedisClient_options, "f")?.socket).on("data", (chunk) => __classPrivateFieldGet(this, _RedisClient_queue, "f").onReplyChunk(chunk)).on("error", (err) => {
        this.emit("error", err);
        if (__classPrivateFieldGet(this, _RedisClient_socket, "f").isOpen && !__classPrivateFieldGet(this, _RedisClient_options, "f")?.disableOfflineQueue) {
          __classPrivateFieldGet(this, _RedisClient_queue, "f").flushWaitingForReply(err);
        } else {
          __classPrivateFieldGet(this, _RedisClient_queue, "f").flushAll(err);
        }
      }).on("connect", () => {
        this.emit("connect");
      }).on("ready", () => {
        this.emit("ready");
        __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_setPingTimer).call(this);
        __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_tick).call(this);
      }).on("reconnecting", () => this.emit("reconnecting")).on("drain", () => __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_tick).call(this)).on("end", () => this.emit("end"));
    }, _RedisClient_initiateIsolationPool = function _RedisClient_initiateIsolationPool2() {
      return (0, generic_pool_1.createPool)({
        create: async () => {
          const duplicate = this.duplicate({
            isolationPoolOptions: void 0
          }).on("error", (err) => this.emit("error", err));
          await duplicate.connect();
          return duplicate;
        },
        destroy: (client) => client.disconnect()
      }, __classPrivateFieldGet(this, _RedisClient_options, "f")?.isolationPoolOptions);
    }, _RedisClient_legacyMode = function _RedisClient_legacyMode2() {
      var _b, _c;
      if (!__classPrivateFieldGet(this, _RedisClient_options, "f")?.legacyMode)
        return;
      __classPrivateFieldGet(this, _RedisClient_v4, "f").sendCommand = __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_sendCommand).bind(this);
      this.sendCommand = (...args) => {
        const result = __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_legacySendCommand).call(this, ...args);
        if (result) {
          result.promise.then((reply) => result.callback(null, reply)).catch((err) => result.callback(err));
        }
      };
      for (const [name, command] of Object.entries(commands_1.default)) {
        __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, name, command);
        (_b = this)[_c = name.toLowerCase()] ?? (_b[_c] = this[name]);
      }
      __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, "SELECT");
      __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, "select");
      __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, "SUBSCRIBE");
      __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, "subscribe");
      __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, "PSUBSCRIBE");
      __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, "pSubscribe");
      __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, "UNSUBSCRIBE");
      __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, "unsubscribe");
      __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, "PUNSUBSCRIBE");
      __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, "pUnsubscribe");
      __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, "QUIT");
      __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, "quit");
    }, _RedisClient_legacySendCommand = function _RedisClient_legacySendCommand2(...args) {
      const callback = typeof args[args.length - 1] === "function" ? args.pop() : void 0;
      const promise = __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_sendCommand).call(this, (0, commander_1.transformLegacyCommandArguments)(args));
      if (callback)
        return {
          promise,
          callback
        };
      promise.catch((err) => this.emit("error", err));
    }, _RedisClient_defineLegacyCommand = function _RedisClient_defineLegacyCommand2(name, command) {
      __classPrivateFieldGet(this, _RedisClient_v4, "f")[name] = this[name].bind(this);
      this[name] = command && command.TRANSFORM_LEGACY_REPLY && command.transformReply ? (...args) => {
        const result = __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_legacySendCommand).call(this, name, ...args);
        if (result) {
          result.promise.then((reply) => result.callback(null, command.transformReply(reply))).catch((err) => result.callback(err));
        }
      } : (...args) => this.sendCommand(name, ...args);
    }, _RedisClient_setPingTimer = function _RedisClient_setPingTimer2() {
      if (!__classPrivateFieldGet(this, _RedisClient_options, "f")?.pingInterval || !__classPrivateFieldGet(this, _RedisClient_socket, "f").isReady)
        return;
      clearTimeout(__classPrivateFieldGet(this, _RedisClient_pingTimer, "f"));
      __classPrivateFieldSet(this, _RedisClient_pingTimer, setTimeout(() => {
        if (!__classPrivateFieldGet(this, _RedisClient_socket, "f").isReady)
          return;
        __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_sendCommand).call(this, ["PING"]).then((reply) => this.emit("ping-interval", reply)).catch((err) => this.emit("error", err)).finally(() => __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_setPingTimer2).call(this));
      }, __classPrivateFieldGet(this, _RedisClient_options, "f").pingInterval), "f");
    }, _RedisClient_sendCommand = function _RedisClient_sendCommand2(args, options) {
      if (!__classPrivateFieldGet(this, _RedisClient_socket, "f").isOpen) {
        return Promise.reject(new errors_1.ClientClosedError());
      } else if (options?.isolated) {
        return this.executeIsolated((isolatedClient) => isolatedClient.sendCommand(args, {
          ...options,
          isolated: false
        }));
      } else if (!__classPrivateFieldGet(this, _RedisClient_socket, "f").isReady && __classPrivateFieldGet(this, _RedisClient_options, "f")?.disableOfflineQueue) {
        return Promise.reject(new errors_1.ClientOfflineError());
      }
      const promise = __classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(args, options);
      __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_tick).call(this);
      return promise;
    }, _RedisClient_pubSubCommand = function _RedisClient_pubSubCommand2(promise) {
      if (promise === void 0)
        return Promise.resolve();
      __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_tick).call(this);
      return promise;
    }, _RedisClient_tick = function _RedisClient_tick2(force = false) {
      if (__classPrivateFieldGet(this, _RedisClient_socket, "f").writableNeedDrain || !force && !__classPrivateFieldGet(this, _RedisClient_socket, "f").isReady) {
        return;
      }
      __classPrivateFieldGet(this, _RedisClient_socket, "f").cork();
      while (!__classPrivateFieldGet(this, _RedisClient_socket, "f").writableNeedDrain) {
        const args = __classPrivateFieldGet(this, _RedisClient_queue, "f").getCommandToSend();
        if (args === void 0)
          break;
        __classPrivateFieldGet(this, _RedisClient_socket, "f").writeCommand(args);
      }
    }, _RedisClient_addMultiCommands = function _RedisClient_addMultiCommands2(commands, chainId) {
      return Promise.all(commands.map(({ args }) => __classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(args, { chainId })));
    }, _RedisClient_destroyIsolationPool = async function _RedisClient_destroyIsolationPool2() {
      await __classPrivateFieldGet(this, _RedisClient_isolationPool, "f").drain();
      await __classPrivateFieldGet(this, _RedisClient_isolationPool, "f").clear();
      __classPrivateFieldSet(this, _RedisClient_isolationPool, void 0, "f");
    };
    exports.default = RedisClient;
    (0, commander_1.attachCommands)({
      BaseClass: RedisClient,
      commands: commands_1.default,
      executor: RedisClient.prototype.commandsExecutor
    });
    RedisClient.prototype.Multi = multi_command_1.default;
  }
});

// node_modules/cluster-key-slot/lib/index.js
var require_lib3 = __commonJS({
  "node_modules/cluster-key-slot/lib/index.js"(exports, module2) {
    var lookup = [
      0,
      4129,
      8258,
      12387,
      16516,
      20645,
      24774,
      28903,
      33032,
      37161,
      41290,
      45419,
      49548,
      53677,
      57806,
      61935,
      4657,
      528,
      12915,
      8786,
      21173,
      17044,
      29431,
      25302,
      37689,
      33560,
      45947,
      41818,
      54205,
      50076,
      62463,
      58334,
      9314,
      13379,
      1056,
      5121,
      25830,
      29895,
      17572,
      21637,
      42346,
      46411,
      34088,
      38153,
      58862,
      62927,
      50604,
      54669,
      13907,
      9842,
      5649,
      1584,
      30423,
      26358,
      22165,
      18100,
      46939,
      42874,
      38681,
      34616,
      63455,
      59390,
      55197,
      51132,
      18628,
      22757,
      26758,
      30887,
      2112,
      6241,
      10242,
      14371,
      51660,
      55789,
      59790,
      63919,
      35144,
      39273,
      43274,
      47403,
      23285,
      19156,
      31415,
      27286,
      6769,
      2640,
      14899,
      10770,
      56317,
      52188,
      64447,
      60318,
      39801,
      35672,
      47931,
      43802,
      27814,
      31879,
      19684,
      23749,
      11298,
      15363,
      3168,
      7233,
      60846,
      64911,
      52716,
      56781,
      44330,
      48395,
      36200,
      40265,
      32407,
      28342,
      24277,
      20212,
      15891,
      11826,
      7761,
      3696,
      65439,
      61374,
      57309,
      53244,
      48923,
      44858,
      40793,
      36728,
      37256,
      33193,
      45514,
      41451,
      53516,
      49453,
      61774,
      57711,
      4224,
      161,
      12482,
      8419,
      20484,
      16421,
      28742,
      24679,
      33721,
      37784,
      41979,
      46042,
      49981,
      54044,
      58239,
      62302,
      689,
      4752,
      8947,
      13010,
      16949,
      21012,
      25207,
      29270,
      46570,
      42443,
      38312,
      34185,
      62830,
      58703,
      54572,
      50445,
      13538,
      9411,
      5280,
      1153,
      29798,
      25671,
      21540,
      17413,
      42971,
      47098,
      34713,
      38840,
      59231,
      63358,
      50973,
      55100,
      9939,
      14066,
      1681,
      5808,
      26199,
      30326,
      17941,
      22068,
      55628,
      51565,
      63758,
      59695,
      39368,
      35305,
      47498,
      43435,
      22596,
      18533,
      30726,
      26663,
      6336,
      2273,
      14466,
      10403,
      52093,
      56156,
      60223,
      64286,
      35833,
      39896,
      43963,
      48026,
      19061,
      23124,
      27191,
      31254,
      2801,
      6864,
      10931,
      14994,
      64814,
      60687,
      56684,
      52557,
      48554,
      44427,
      40424,
      36297,
      31782,
      27655,
      23652,
      19525,
      15522,
      11395,
      7392,
      3265,
      61215,
      65342,
      53085,
      57212,
      44955,
      49082,
      36825,
      40952,
      28183,
      32310,
      20053,
      24180,
      11923,
      16050,
      3793,
      7920
    ];
    var toUTF8Array = function toUTF8Array2(str) {
      var char;
      var i = 0;
      var p = 0;
      var utf8 = [];
      var len = str.length;
      for (; i < len; i++) {
        char = str.charCodeAt(i);
        if (char < 128) {
          utf8[p++] = char;
        } else if (char < 2048) {
          utf8[p++] = char >> 6 | 192;
          utf8[p++] = char & 63 | 128;
        } else if ((char & 64512) === 55296 && i + 1 < str.length && (str.charCodeAt(i + 1) & 64512) === 56320) {
          char = 65536 + ((char & 1023) << 10) + (str.charCodeAt(++i) & 1023);
          utf8[p++] = char >> 18 | 240;
          utf8[p++] = char >> 12 & 63 | 128;
          utf8[p++] = char >> 6 & 63 | 128;
          utf8[p++] = char & 63 | 128;
        } else {
          utf8[p++] = char >> 12 | 224;
          utf8[p++] = char >> 6 & 63 | 128;
          utf8[p++] = char & 63 | 128;
        }
      }
      return utf8;
    };
    var generate = module2.exports = function generate2(str) {
      var char;
      var i = 0;
      var start = -1;
      var result = 0;
      var resultHash = 0;
      var utf8 = typeof str === "string" ? toUTF8Array(str) : str;
      var len = utf8.length;
      while (i < len) {
        char = utf8[i++];
        if (start === -1) {
          if (char === 123) {
            start = i;
          }
        } else if (char !== 125) {
          resultHash = lookup[(char ^ resultHash >> 8) & 255] ^ resultHash << 8;
        } else if (i - 1 !== start) {
          return resultHash & 16383;
        }
        result = lookup[(char ^ result >> 8) & 255] ^ result << 8;
      }
      return result & 16383;
    };
    module2.exports.generateMulti = function generateMulti(keys) {
      var i = 1;
      var len = keys.length;
      var base = generate(keys[0]);
      while (i < len) {
        if (generate(keys[i++]) !== base)
          return -1;
      }
      return base;
    };
  }
});

// node_modules/@redis/client/dist/lib/cluster/cluster-slots.js
var require_cluster_slots = __commonJS({
  "node_modules/@redis/client/dist/lib/cluster/cluster-slots.js"(exports) {
    "use strict";
    var __classPrivateFieldGet = exports && exports.__classPrivateFieldGet || function(receiver, state, kind, f) {
      if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a getter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot read private member from an object whose class did not declare it");
      return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    };
    var __classPrivateFieldSet = exports && exports.__classPrivateFieldSet || function(receiver, state, value, kind, f) {
      if (kind === "m")
        throw new TypeError("Private method is not writable");
      if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a setter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot write private member to an object whose class did not declare it");
      return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
    };
    var _RedisClusterSlots_instances;
    var _a;
    var _RedisClusterSlots_SLOTS;
    var _RedisClusterSlots_options;
    var _RedisClusterSlots_Client;
    var _RedisClusterSlots_emit;
    var _RedisClusterSlots_isOpen;
    var _RedisClusterSlots_discoverWithRootNodes;
    var _RedisClusterSlots_resetSlots;
    var _RedisClusterSlots_discover;
    var _RedisClusterSlots_getShards;
    var _RedisClusterSlots_getNodeAddress;
    var _RedisClusterSlots_clientOptionsDefaults;
    var _RedisClusterSlots_initiateSlotNode;
    var _RedisClusterSlots_createClient;
    var _RedisClusterSlots_createNodeClient;
    var _RedisClusterSlots_runningRediscoverPromise;
    var _RedisClusterSlots_rediscover;
    var _RedisClusterSlots_destroy;
    var _RedisClusterSlots_execOnNodeClient;
    var _RedisClusterSlots_iterateAllNodes;
    var _RedisClusterSlots_randomNodeIterator;
    var _RedisClusterSlots_slotNodesIterator;
    var _RedisClusterSlots_initiatePubSubClient;
    var _RedisClusterSlots_initiateShardedPubSubClient;
    Object.defineProperty(exports, "__esModule", { value: true });
    var client_1 = require_client3();
    var errors_1 = require_errors();
    var util_1 = require("util");
    var pub_sub_1 = require_pub_sub();
    var calculateSlot = require_lib3();
    var RedisClusterSlots = class {
      get isOpen() {
        return __classPrivateFieldGet(this, _RedisClusterSlots_isOpen, "f");
      }
      constructor(options, emit) {
        _RedisClusterSlots_instances.add(this);
        _RedisClusterSlots_options.set(this, void 0);
        _RedisClusterSlots_Client.set(this, void 0);
        _RedisClusterSlots_emit.set(this, void 0);
        Object.defineProperty(this, "slots", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: new Array(__classPrivateFieldGet(_a, _a, "f", _RedisClusterSlots_SLOTS))
        });
        Object.defineProperty(this, "shards", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: new Array()
        });
        Object.defineProperty(this, "masters", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: new Array()
        });
        Object.defineProperty(this, "replicas", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: new Array()
        });
        Object.defineProperty(this, "nodeByAddress", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: /* @__PURE__ */ new Map()
        });
        Object.defineProperty(this, "pubSubNode", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        _RedisClusterSlots_isOpen.set(this, false);
        _RedisClusterSlots_runningRediscoverPromise.set(this, void 0);
        _RedisClusterSlots_randomNodeIterator.set(this, void 0);
        __classPrivateFieldSet(this, _RedisClusterSlots_options, options, "f");
        __classPrivateFieldSet(this, _RedisClusterSlots_Client, client_1.default.extend(options), "f");
        __classPrivateFieldSet(this, _RedisClusterSlots_emit, emit, "f");
      }
      async connect() {
        if (__classPrivateFieldGet(this, _RedisClusterSlots_isOpen, "f")) {
          throw new Error("Cluster already open");
        }
        __classPrivateFieldSet(this, _RedisClusterSlots_isOpen, true, "f");
        try {
          await __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_discoverWithRootNodes).call(this);
        } catch (err) {
          __classPrivateFieldSet(this, _RedisClusterSlots_isOpen, false, "f");
          throw err;
        }
      }
      nodeClient(node) {
        return node.client ?? __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_createNodeClient).call(this, node);
      }
      async rediscover(startWith) {
        __classPrivateFieldSet(this, _RedisClusterSlots_runningRediscoverPromise, __classPrivateFieldGet(this, _RedisClusterSlots_runningRediscoverPromise, "f") ?? __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_rediscover).call(this, startWith).finally(() => __classPrivateFieldSet(this, _RedisClusterSlots_runningRediscoverPromise, void 0, "f")), "f");
        return __classPrivateFieldGet(this, _RedisClusterSlots_runningRediscoverPromise, "f");
      }
      quit() {
        return __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_destroy).call(this, (client) => client.quit());
      }
      disconnect() {
        return __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_destroy).call(this, (client) => client.disconnect());
      }
      getClient(firstKey, isReadonly) {
        if (!firstKey) {
          return this.nodeClient(this.getRandomNode());
        }
        const slotNumber = calculateSlot(firstKey);
        if (!isReadonly) {
          return this.nodeClient(this.slots[slotNumber].master);
        }
        return this.nodeClient(this.getSlotRandomNode(slotNumber));
      }
      getRandomNode() {
        __classPrivateFieldSet(this, _RedisClusterSlots_randomNodeIterator, __classPrivateFieldGet(this, _RedisClusterSlots_randomNodeIterator, "f") ?? __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_iterateAllNodes).call(this), "f");
        return __classPrivateFieldGet(this, _RedisClusterSlots_randomNodeIterator, "f").next().value;
      }
      getSlotRandomNode(slotNumber) {
        const slot = this.slots[slotNumber];
        if (!slot.replicas?.length) {
          return slot.master;
        }
        slot.nodesIterator ?? (slot.nodesIterator = __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_slotNodesIterator).call(this, slot));
        return slot.nodesIterator.next().value;
      }
      getMasterByAddress(address) {
        const master = this.nodeByAddress.get(address);
        if (!master)
          return;
        return this.nodeClient(master);
      }
      getPubSubClient() {
        return this.pubSubNode ? this.pubSubNode.client : __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_initiatePubSubClient).call(this);
      }
      async executeUnsubscribeCommand(unsubscribe) {
        const client = await this.getPubSubClient();
        await unsubscribe(client);
        if (!client.isPubSubActive) {
          await client.disconnect();
          this.pubSubNode = void 0;
        }
      }
      getShardedPubSubClient(channel) {
        const { master } = this.slots[calculateSlot(channel)];
        return master.pubSubClient ?? __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_initiateShardedPubSubClient).call(this, master);
      }
      async executeShardedUnsubscribeCommand(channel, unsubscribe) {
        const { master } = this.slots[calculateSlot(channel)];
        if (!master.pubSubClient)
          return Promise.resolve();
        const client = await master.pubSubClient;
        await unsubscribe(client);
        if (!client.isPubSubActive) {
          await client.disconnect();
          master.pubSubClient = void 0;
        }
      }
    };
    _a = RedisClusterSlots, _RedisClusterSlots_options = /* @__PURE__ */ new WeakMap(), _RedisClusterSlots_Client = /* @__PURE__ */ new WeakMap(), _RedisClusterSlots_emit = /* @__PURE__ */ new WeakMap(), _RedisClusterSlots_isOpen = /* @__PURE__ */ new WeakMap(), _RedisClusterSlots_runningRediscoverPromise = /* @__PURE__ */ new WeakMap(), _RedisClusterSlots_randomNodeIterator = /* @__PURE__ */ new WeakMap(), _RedisClusterSlots_instances = /* @__PURE__ */ new WeakSet(), _RedisClusterSlots_discoverWithRootNodes = async function _RedisClusterSlots_discoverWithRootNodes2() {
      let start = Math.floor(Math.random() * __classPrivateFieldGet(this, _RedisClusterSlots_options, "f").rootNodes.length);
      for (let i = start; i < __classPrivateFieldGet(this, _RedisClusterSlots_options, "f").rootNodes.length; i++) {
        if (await __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_discover).call(this, __classPrivateFieldGet(this, _RedisClusterSlots_options, "f").rootNodes[i]))
          return;
      }
      for (let i = 0; i < start; i++) {
        if (await __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_discover).call(this, __classPrivateFieldGet(this, _RedisClusterSlots_options, "f").rootNodes[i]))
          return;
      }
      throw new errors_1.RootNodesUnavailableError();
    }, _RedisClusterSlots_resetSlots = function _RedisClusterSlots_resetSlots2() {
      this.slots = new Array(__classPrivateFieldGet(_a, _a, "f", _RedisClusterSlots_SLOTS));
      this.shards = [];
      this.masters = [];
      this.replicas = [];
      __classPrivateFieldSet(this, _RedisClusterSlots_randomNodeIterator, void 0, "f");
    }, _RedisClusterSlots_discover = async function _RedisClusterSlots_discover2(rootNode) {
      __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_resetSlots).call(this);
      const addressesInUse = /* @__PURE__ */ new Set();
      try {
        const shards = await __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_getShards).call(this, rootNode), promises = [], eagerConnect = __classPrivateFieldGet(this, _RedisClusterSlots_options, "f").minimizeConnections !== true;
        for (const { from, to, master, replicas } of shards) {
          const shard = {
            master: __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_initiateSlotNode).call(this, master, false, eagerConnect, addressesInUse, promises)
          };
          if (__classPrivateFieldGet(this, _RedisClusterSlots_options, "f").useReplicas) {
            shard.replicas = replicas.map((replica) => __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_initiateSlotNode).call(this, replica, true, eagerConnect, addressesInUse, promises));
          }
          this.shards.push(shard);
          for (let i = from; i <= to; i++) {
            this.slots[i] = shard;
          }
        }
        if (this.pubSubNode && !addressesInUse.has(this.pubSubNode.address)) {
          if (util_1.types.isPromise(this.pubSubNode.client)) {
            promises.push(this.pubSubNode.client.then((client) => client.disconnect()));
            this.pubSubNode = void 0;
          } else {
            promises.push(this.pubSubNode.client.disconnect());
            const channelsListeners = this.pubSubNode.client.getPubSubListeners(pub_sub_1.PubSubType.CHANNELS), patternsListeners = this.pubSubNode.client.getPubSubListeners(pub_sub_1.PubSubType.PATTERNS);
            if (channelsListeners.size || patternsListeners.size) {
              promises.push(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_initiatePubSubClient).call(this, {
                [pub_sub_1.PubSubType.CHANNELS]: channelsListeners,
                [pub_sub_1.PubSubType.PATTERNS]: patternsListeners
              }));
            }
          }
        }
        for (const [address, node] of this.nodeByAddress.entries()) {
          if (addressesInUse.has(address))
            continue;
          if (node.client) {
            promises.push(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_execOnNodeClient).call(this, node.client, (client) => client.disconnect()));
          }
          const { pubSubClient } = node;
          if (pubSubClient) {
            promises.push(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_execOnNodeClient).call(this, pubSubClient, (client) => client.disconnect()));
          }
          this.nodeByAddress.delete(address);
        }
        await Promise.all(promises);
        return true;
      } catch (err) {
        __classPrivateFieldGet(this, _RedisClusterSlots_emit, "f").call(this, "error", err);
        return false;
      }
    }, _RedisClusterSlots_getShards = async function _RedisClusterSlots_getShards2(rootNode) {
      const client = new (__classPrivateFieldGet(this, _RedisClusterSlots_Client, "f"))(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_clientOptionsDefaults).call(this, rootNode, true));
      client.on("error", (err) => __classPrivateFieldGet(this, _RedisClusterSlots_emit, "f").call(this, "error", err));
      await client.connect();
      try {
        return await client.clusterSlots();
      } finally {
        await client.disconnect();
      }
    }, _RedisClusterSlots_getNodeAddress = function _RedisClusterSlots_getNodeAddress2(address) {
      switch (typeof __classPrivateFieldGet(this, _RedisClusterSlots_options, "f").nodeAddressMap) {
        case "object":
          return __classPrivateFieldGet(this, _RedisClusterSlots_options, "f").nodeAddressMap[address];
        case "function":
          return __classPrivateFieldGet(this, _RedisClusterSlots_options, "f").nodeAddressMap(address);
      }
    }, _RedisClusterSlots_clientOptionsDefaults = function _RedisClusterSlots_clientOptionsDefaults2(options, disableReconnect) {
      let result;
      if (__classPrivateFieldGet(this, _RedisClusterSlots_options, "f").defaults) {
        let socket;
        if (__classPrivateFieldGet(this, _RedisClusterSlots_options, "f").defaults.socket) {
          socket = options?.socket ? {
            ...__classPrivateFieldGet(this, _RedisClusterSlots_options, "f").defaults.socket,
            ...options.socket
          } : __classPrivateFieldGet(this, _RedisClusterSlots_options, "f").defaults.socket;
        } else {
          socket = options?.socket;
        }
        result = {
          ...__classPrivateFieldGet(this, _RedisClusterSlots_options, "f").defaults,
          ...options,
          socket
        };
      } else {
        result = options;
      }
      if (disableReconnect) {
        result ?? (result = {});
        result.socket ?? (result.socket = {});
        result.socket.reconnectStrategy = false;
      }
      return result;
    }, _RedisClusterSlots_initiateSlotNode = function _RedisClusterSlots_initiateSlotNode2({ id, ip, port }, readonly, eagerConnent, addressesInUse, promises) {
      const address = `${ip}:${port}`;
      addressesInUse.add(address);
      let node = this.nodeByAddress.get(address);
      if (!node) {
        node = {
          id,
          host: ip,
          port,
          address,
          readonly,
          client: void 0
        };
        if (eagerConnent) {
          promises.push(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_createNodeClient).call(this, node));
        }
        this.nodeByAddress.set(address, node);
      }
      (readonly ? this.replicas : this.masters).push(node);
      return node;
    }, _RedisClusterSlots_createClient = async function _RedisClusterSlots_createClient2(node, readonly = node.readonly) {
      const client = new (__classPrivateFieldGet(this, _RedisClusterSlots_Client, "f"))(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_clientOptionsDefaults).call(this, {
        socket: __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_getNodeAddress).call(this, node.address) ?? {
          host: node.host,
          port: node.port
        },
        readonly
      }));
      client.on("error", (err) => __classPrivateFieldGet(this, _RedisClusterSlots_emit, "f").call(this, "error", err));
      await client.connect();
      return client;
    }, _RedisClusterSlots_createNodeClient = function _RedisClusterSlots_createNodeClient2(node) {
      const promise = __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_createClient).call(this, node).then((client) => {
        node.client = client;
        return client;
      }).catch((err) => {
        node.client = void 0;
        throw err;
      });
      node.client = promise;
      return promise;
    }, _RedisClusterSlots_rediscover = async function _RedisClusterSlots_rediscover2(startWith) {
      if (await __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_discover).call(this, startWith.options))
        return;
      return __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_discoverWithRootNodes).call(this);
    }, _RedisClusterSlots_destroy = async function _RedisClusterSlots_destroy2(fn) {
      __classPrivateFieldSet(this, _RedisClusterSlots_isOpen, false, "f");
      const promises = [];
      for (const { master, replicas } of this.shards) {
        if (master.client) {
          promises.push(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_execOnNodeClient).call(this, master.client, fn));
        }
        if (master.pubSubClient) {
          promises.push(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_execOnNodeClient).call(this, master.pubSubClient, fn));
        }
        if (replicas) {
          for (const { client } of replicas) {
            if (client) {
              promises.push(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_execOnNodeClient).call(this, client, fn));
            }
          }
        }
      }
      if (this.pubSubNode) {
        promises.push(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_execOnNodeClient).call(this, this.pubSubNode.client, fn));
        this.pubSubNode = void 0;
      }
      __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_resetSlots).call(this);
      this.nodeByAddress.clear();
      await Promise.allSettled(promises);
    }, _RedisClusterSlots_execOnNodeClient = function _RedisClusterSlots_execOnNodeClient2(client, fn) {
      return util_1.types.isPromise(client) ? client.then(fn) : fn(client);
    }, _RedisClusterSlots_iterateAllNodes = function* _RedisClusterSlots_iterateAllNodes2() {
      let i = Math.floor(Math.random() * (this.masters.length + this.replicas.length));
      if (i < this.masters.length) {
        do {
          yield this.masters[i];
        } while (++i < this.masters.length);
        for (const replica of this.replicas) {
          yield replica;
        }
      } else {
        i -= this.masters.length;
        do {
          yield this.replicas[i];
        } while (++i < this.replicas.length);
      }
      while (true) {
        for (const master of this.masters) {
          yield master;
        }
        for (const replica of this.replicas) {
          yield replica;
        }
      }
    }, _RedisClusterSlots_slotNodesIterator = function* _RedisClusterSlots_slotNodesIterator2(slot) {
      let i = Math.floor(Math.random() * (1 + slot.replicas.length));
      if (i < slot.replicas.length) {
        do {
          yield slot.replicas[i];
        } while (++i < slot.replicas.length);
      }
      while (true) {
        yield slot.master;
        for (const replica of slot.replicas) {
          yield replica;
        }
      }
    }, _RedisClusterSlots_initiatePubSubClient = async function _RedisClusterSlots_initiatePubSubClient2(toResubscribe) {
      const index = Math.floor(Math.random() * (this.masters.length + this.replicas.length)), node = index < this.masters.length ? this.masters[index] : this.replicas[index - this.masters.length];
      this.pubSubNode = {
        address: node.address,
        client: __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_createClient).call(this, node, true).then(async (client) => {
          if (toResubscribe) {
            await Promise.all([
              client.extendPubSubListeners(pub_sub_1.PubSubType.CHANNELS, toResubscribe[pub_sub_1.PubSubType.CHANNELS]),
              client.extendPubSubListeners(pub_sub_1.PubSubType.PATTERNS, toResubscribe[pub_sub_1.PubSubType.PATTERNS])
            ]);
          }
          this.pubSubNode.client = client;
          return client;
        }).catch((err) => {
          this.pubSubNode = void 0;
          throw err;
        })
      };
      return this.pubSubNode.client;
    }, _RedisClusterSlots_initiateShardedPubSubClient = function _RedisClusterSlots_initiateShardedPubSubClient2(master) {
      const promise = __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_createClient).call(this, master, true).then((client) => {
        client.on("server-sunsubscribe", async (channel, listeners) => {
          try {
            await this.rediscover(client);
            const redirectTo = await this.getShardedPubSubClient(channel);
            redirectTo.extendPubSubChannelListeners(pub_sub_1.PubSubType.SHARDED, channel, listeners);
          } catch (err) {
            __classPrivateFieldGet(this, _RedisClusterSlots_emit, "f").call(this, "sharded-shannel-moved-error", err, channel, listeners);
          }
        });
        master.pubSubClient = client;
        return client;
      }).catch((err) => {
        master.pubSubClient = void 0;
        throw err;
      });
      master.pubSubClient = promise;
      return promise;
    };
    _RedisClusterSlots_SLOTS = { value: 16384 };
    exports.default = RedisClusterSlots;
  }
});

// node_modules/@redis/client/dist/lib/cluster/multi-command.js
var require_multi_command3 = __commonJS({
  "node_modules/@redis/client/dist/lib/cluster/multi-command.js"(exports) {
    "use strict";
    var __classPrivateFieldSet = exports && exports.__classPrivateFieldSet || function(receiver, state, value, kind, f) {
      if (kind === "m")
        throw new TypeError("Private method is not writable");
      if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a setter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot write private member to an object whose class did not declare it");
      return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
    };
    var __classPrivateFieldGet = exports && exports.__classPrivateFieldGet || function(receiver, state, kind, f) {
      if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a getter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot read private member from an object whose class did not declare it");
      return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    };
    var _RedisClusterMultiCommand_multi;
    var _RedisClusterMultiCommand_executor;
    var _RedisClusterMultiCommand_firstKey;
    Object.defineProperty(exports, "__esModule", { value: true });
    var commands_1 = require_commands();
    var multi_command_1 = require_multi_command();
    var commander_1 = require_commander();
    var _1 = require_cluster();
    var RedisClusterMultiCommand = class _RedisClusterMultiCommand {
      static extend(extensions) {
        return (0, commander_1.attachExtensions)({
          BaseClass: _RedisClusterMultiCommand,
          modulesExecutor: _RedisClusterMultiCommand.prototype.commandsExecutor,
          modules: extensions?.modules,
          functionsExecutor: _RedisClusterMultiCommand.prototype.functionsExecutor,
          functions: extensions?.functions,
          scriptsExecutor: _RedisClusterMultiCommand.prototype.scriptsExecutor,
          scripts: extensions?.scripts
        });
      }
      constructor(executor, firstKey) {
        _RedisClusterMultiCommand_multi.set(this, new multi_command_1.default());
        _RedisClusterMultiCommand_executor.set(this, void 0);
        _RedisClusterMultiCommand_firstKey.set(this, void 0);
        Object.defineProperty(this, "EXEC", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.exec
        });
        __classPrivateFieldSet(this, _RedisClusterMultiCommand_executor, executor, "f");
        __classPrivateFieldSet(this, _RedisClusterMultiCommand_firstKey, firstKey, "f");
      }
      commandsExecutor(command, args) {
        const transformedArguments = command.transformArguments(...args);
        __classPrivateFieldSet(this, _RedisClusterMultiCommand_firstKey, __classPrivateFieldGet(this, _RedisClusterMultiCommand_firstKey, "f") ?? _1.default.extractFirstKey(command, args, transformedArguments), "f");
        return this.addCommand(void 0, transformedArguments, command.transformReply);
      }
      addCommand(firstKey, args, transformReply) {
        __classPrivateFieldSet(this, _RedisClusterMultiCommand_firstKey, __classPrivateFieldGet(this, _RedisClusterMultiCommand_firstKey, "f") ?? firstKey, "f");
        __classPrivateFieldGet(this, _RedisClusterMultiCommand_multi, "f").addCommand(args, transformReply);
        return this;
      }
      functionsExecutor(fn, args, name) {
        const transformedArguments = __classPrivateFieldGet(this, _RedisClusterMultiCommand_multi, "f").addFunction(name, fn, args);
        __classPrivateFieldSet(this, _RedisClusterMultiCommand_firstKey, __classPrivateFieldGet(this, _RedisClusterMultiCommand_firstKey, "f") ?? _1.default.extractFirstKey(fn, args, transformedArguments), "f");
        return this;
      }
      scriptsExecutor(script, args) {
        const transformedArguments = __classPrivateFieldGet(this, _RedisClusterMultiCommand_multi, "f").addScript(script, args);
        __classPrivateFieldSet(this, _RedisClusterMultiCommand_firstKey, __classPrivateFieldGet(this, _RedisClusterMultiCommand_firstKey, "f") ?? _1.default.extractFirstKey(script, args, transformedArguments), "f");
        return this;
      }
      async exec(execAsPipeline = false) {
        if (execAsPipeline) {
          return this.execAsPipeline();
        }
        return __classPrivateFieldGet(this, _RedisClusterMultiCommand_multi, "f").handleExecReplies(await __classPrivateFieldGet(this, _RedisClusterMultiCommand_executor, "f").call(this, __classPrivateFieldGet(this, _RedisClusterMultiCommand_multi, "f").queue, __classPrivateFieldGet(this, _RedisClusterMultiCommand_firstKey, "f"), multi_command_1.default.generateChainId()));
      }
      async execAsPipeline() {
        return __classPrivateFieldGet(this, _RedisClusterMultiCommand_multi, "f").transformReplies(await __classPrivateFieldGet(this, _RedisClusterMultiCommand_executor, "f").call(this, __classPrivateFieldGet(this, _RedisClusterMultiCommand_multi, "f").queue, __classPrivateFieldGet(this, _RedisClusterMultiCommand_firstKey, "f")));
      }
    };
    _RedisClusterMultiCommand_multi = /* @__PURE__ */ new WeakMap(), _RedisClusterMultiCommand_executor = /* @__PURE__ */ new WeakMap(), _RedisClusterMultiCommand_firstKey = /* @__PURE__ */ new WeakMap();
    exports.default = RedisClusterMultiCommand;
    (0, commander_1.attachCommands)({
      BaseClass: RedisClusterMultiCommand,
      commands: commands_1.default,
      executor: RedisClusterMultiCommand.prototype.commandsExecutor
    });
  }
});

// node_modules/@redis/client/dist/lib/cluster/index.js
var require_cluster = __commonJS({
  "node_modules/@redis/client/dist/lib/cluster/index.js"(exports) {
    "use strict";
    var __classPrivateFieldGet = exports && exports.__classPrivateFieldGet || function(receiver, state, kind, f) {
      if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a getter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot read private member from an object whose class did not declare it");
      return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    };
    var __classPrivateFieldSet = exports && exports.__classPrivateFieldSet || function(receiver, state, value, kind, f) {
      if (kind === "m")
        throw new TypeError("Private method is not writable");
      if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a setter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot write private member to an object whose class did not declare it");
      return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
    };
    var _RedisCluster_instances;
    var _RedisCluster_options;
    var _RedisCluster_slots;
    var _RedisCluster_Multi;
    var _RedisCluster_execute;
    Object.defineProperty(exports, "__esModule", { value: true });
    var commands_1 = require_commands();
    var cluster_slots_1 = require_cluster_slots();
    var commander_1 = require_commander();
    var events_1 = require("events");
    var multi_command_1 = require_multi_command3();
    var errors_1 = require_errors();
    var RedisCluster = class _RedisCluster extends events_1.EventEmitter {
      static extractFirstKey(command, originalArgs, redisArgs) {
        if (command.FIRST_KEY_INDEX === void 0) {
          return void 0;
        } else if (typeof command.FIRST_KEY_INDEX === "number") {
          return redisArgs[command.FIRST_KEY_INDEX];
        }
        return command.FIRST_KEY_INDEX(...originalArgs);
      }
      static create(options) {
        return new ((0, commander_1.attachExtensions)({
          BaseClass: _RedisCluster,
          modulesExecutor: _RedisCluster.prototype.commandsExecutor,
          modules: options?.modules,
          functionsExecutor: _RedisCluster.prototype.functionsExecutor,
          functions: options?.functions,
          scriptsExecutor: _RedisCluster.prototype.scriptsExecutor,
          scripts: options?.scripts
        }))(options);
      }
      get slots() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").slots;
      }
      get shards() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").shards;
      }
      get masters() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").masters;
      }
      get replicas() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").replicas;
      }
      get nodeByAddress() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").nodeByAddress;
      }
      get pubSubNode() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").pubSubNode;
      }
      get isOpen() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").isOpen;
      }
      constructor(options) {
        super();
        _RedisCluster_instances.add(this);
        _RedisCluster_options.set(this, void 0);
        _RedisCluster_slots.set(this, void 0);
        _RedisCluster_Multi.set(this, void 0);
        Object.defineProperty(this, "multi", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.MULTI
        });
        Object.defineProperty(this, "subscribe", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.SUBSCRIBE
        });
        Object.defineProperty(this, "unsubscribe", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.UNSUBSCRIBE
        });
        Object.defineProperty(this, "pSubscribe", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.PSUBSCRIBE
        });
        Object.defineProperty(this, "pUnsubscribe", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.PUNSUBSCRIBE
        });
        Object.defineProperty(this, "sSubscribe", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.SSUBSCRIBE
        });
        Object.defineProperty(this, "sUnsubscribe", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: this.SUNSUBSCRIBE
        });
        __classPrivateFieldSet(this, _RedisCluster_options, options, "f");
        __classPrivateFieldSet(this, _RedisCluster_slots, new cluster_slots_1.default(options, this.emit.bind(this)), "f");
        __classPrivateFieldSet(this, _RedisCluster_Multi, multi_command_1.default.extend(options), "f");
      }
      duplicate(overrides) {
        return new (Object.getPrototypeOf(this)).constructor({
          ...__classPrivateFieldGet(this, _RedisCluster_options, "f"),
          ...overrides
        });
      }
      connect() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").connect();
      }
      async commandsExecutor(command, args) {
        const { jsArgs, args: redisArgs, options } = (0, commander_1.transformCommandArguments)(command, args);
        return (0, commander_1.transformCommandReply)(command, await this.sendCommand(_RedisCluster.extractFirstKey(command, jsArgs, redisArgs), command.IS_READ_ONLY, redisArgs, options), redisArgs.preserve);
      }
      async sendCommand(firstKey, isReadonly, args, options) {
        return __classPrivateFieldGet(this, _RedisCluster_instances, "m", _RedisCluster_execute).call(this, firstKey, isReadonly, (client) => client.sendCommand(args, options));
      }
      async functionsExecutor(fn, args, name) {
        const { args: redisArgs, options } = (0, commander_1.transformCommandArguments)(fn, args);
        return (0, commander_1.transformCommandReply)(fn, await this.executeFunction(name, fn, args, redisArgs, options), redisArgs.preserve);
      }
      async executeFunction(name, fn, originalArgs, redisArgs, options) {
        return __classPrivateFieldGet(this, _RedisCluster_instances, "m", _RedisCluster_execute).call(this, _RedisCluster.extractFirstKey(fn, originalArgs, redisArgs), fn.IS_READ_ONLY, (client) => client.executeFunction(name, fn, redisArgs, options));
      }
      async scriptsExecutor(script, args) {
        const { args: redisArgs, options } = (0, commander_1.transformCommandArguments)(script, args);
        return (0, commander_1.transformCommandReply)(script, await this.executeScript(script, args, redisArgs, options), redisArgs.preserve);
      }
      async executeScript(script, originalArgs, redisArgs, options) {
        return __classPrivateFieldGet(this, _RedisCluster_instances, "m", _RedisCluster_execute).call(this, _RedisCluster.extractFirstKey(script, originalArgs, redisArgs), script.IS_READ_ONLY, (client) => client.executeScript(script, redisArgs, options));
      }
      MULTI(routing) {
        return new (__classPrivateFieldGet(this, _RedisCluster_Multi, "f"))((commands, firstKey, chainId) => {
          return __classPrivateFieldGet(this, _RedisCluster_instances, "m", _RedisCluster_execute).call(this, firstKey, false, (client) => client.multiExecutor(commands, void 0, chainId));
        }, routing);
      }
      async SUBSCRIBE(channels, listener, bufferMode) {
        return (await __classPrivateFieldGet(this, _RedisCluster_slots, "f").getPubSubClient()).SUBSCRIBE(channels, listener, bufferMode);
      }
      async UNSUBSCRIBE(channels, listener, bufferMode) {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").executeUnsubscribeCommand((client) => client.UNSUBSCRIBE(channels, listener, bufferMode));
      }
      async PSUBSCRIBE(patterns, listener, bufferMode) {
        return (await __classPrivateFieldGet(this, _RedisCluster_slots, "f").getPubSubClient()).PSUBSCRIBE(patterns, listener, bufferMode);
      }
      async PUNSUBSCRIBE(patterns, listener, bufferMode) {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").executeUnsubscribeCommand((client) => client.PUNSUBSCRIBE(patterns, listener, bufferMode));
      }
      async SSUBSCRIBE(channels, listener, bufferMode) {
        const maxCommandRedirections = __classPrivateFieldGet(this, _RedisCluster_options, "f").maxCommandRedirections ?? 16, firstChannel = Array.isArray(channels) ? channels[0] : channels;
        let client = await __classPrivateFieldGet(this, _RedisCluster_slots, "f").getShardedPubSubClient(firstChannel);
        for (let i = 0; ; i++) {
          try {
            return await client.SSUBSCRIBE(channels, listener, bufferMode);
          } catch (err) {
            if (++i > maxCommandRedirections || !(err instanceof errors_1.ErrorReply)) {
              throw err;
            }
            if (err.message.startsWith("MOVED")) {
              await __classPrivateFieldGet(this, _RedisCluster_slots, "f").rediscover(client);
              client = await __classPrivateFieldGet(this, _RedisCluster_slots, "f").getShardedPubSubClient(firstChannel);
              continue;
            }
            throw err;
          }
        }
      }
      SUNSUBSCRIBE(channels, listener, bufferMode) {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").executeShardedUnsubscribeCommand(Array.isArray(channels) ? channels[0] : channels, (client) => client.SUNSUBSCRIBE(channels, listener, bufferMode));
      }
      quit() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").quit();
      }
      disconnect() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").disconnect();
      }
      nodeClient(node) {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").nodeClient(node);
      }
      getRandomNode() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").getRandomNode();
      }
      getSlotRandomNode(slot) {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").getSlotRandomNode(slot);
      }
      /**
       * @deprecated use `.masters` instead
       */
      getMasters() {
        return this.masters;
      }
      /**
       * @deprecated use `.slots[<SLOT>]` instead
       */
      getSlotMaster(slot) {
        return this.slots[slot].master;
      }
    };
    _RedisCluster_options = /* @__PURE__ */ new WeakMap(), _RedisCluster_slots = /* @__PURE__ */ new WeakMap(), _RedisCluster_Multi = /* @__PURE__ */ new WeakMap(), _RedisCluster_instances = /* @__PURE__ */ new WeakSet(), _RedisCluster_execute = async function _RedisCluster_execute2(firstKey, isReadonly, executor) {
      const maxCommandRedirections = __classPrivateFieldGet(this, _RedisCluster_options, "f").maxCommandRedirections ?? 16;
      let client = await __classPrivateFieldGet(this, _RedisCluster_slots, "f").getClient(firstKey, isReadonly);
      for (let i = 0; ; i++) {
        try {
          return await executor(client);
        } catch (err) {
          if (++i > maxCommandRedirections || !(err instanceof errors_1.ErrorReply)) {
            throw err;
          }
          if (err.message.startsWith("ASK")) {
            const address = err.message.substring(err.message.lastIndexOf(" ") + 1);
            let redirectTo = await __classPrivateFieldGet(this, _RedisCluster_slots, "f").getMasterByAddress(address);
            if (!redirectTo) {
              await __classPrivateFieldGet(this, _RedisCluster_slots, "f").rediscover(client);
              redirectTo = await __classPrivateFieldGet(this, _RedisCluster_slots, "f").getMasterByAddress(address);
            }
            if (!redirectTo) {
              throw new Error(`Cannot find node ${address}`);
            }
            await redirectTo.asking();
            client = redirectTo;
            continue;
          } else if (err.message.startsWith("MOVED")) {
            await __classPrivateFieldGet(this, _RedisCluster_slots, "f").rediscover(client);
            client = await __classPrivateFieldGet(this, _RedisCluster_slots, "f").getClient(firstKey, isReadonly);
            continue;
          }
          throw err;
        }
      }
    };
    exports.default = RedisCluster;
    (0, commander_1.attachCommands)({
      BaseClass: RedisCluster,
      commands: commands_1.default,
      executor: RedisCluster.prototype.commandsExecutor
    });
  }
});

// node_modules/@redis/client/dist/lib/lua-script.js
var require_lua_script = __commonJS({
  "node_modules/@redis/client/dist/lib/lua-script.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.scriptSha1 = exports.defineScript = void 0;
    var crypto_1 = require("crypto");
    function defineScript(script) {
      return {
        ...script,
        SHA1: scriptSha1(script.SCRIPT)
      };
    }
    exports.defineScript = defineScript;
    function scriptSha1(script) {
      return (0, crypto_1.createHash)("sha1").update(script).digest("hex");
    }
    exports.scriptSha1 = scriptSha1;
  }
});

// node_modules/@redis/client/dist/index.js
var require_dist2 = __commonJS({
  "node_modules/@redis/client/dist/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p))
          __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RedisFlushModes = exports.GeoReplyWith = exports.defineScript = exports.createCluster = exports.commandOptions = exports.createClient = void 0;
    var client_1 = require_client3();
    var cluster_1 = require_cluster();
    exports.createClient = client_1.default.create;
    exports.commandOptions = client_1.default.commandOptions;
    exports.createCluster = cluster_1.default.create;
    var lua_script_1 = require_lua_script();
    Object.defineProperty(exports, "defineScript", { enumerable: true, get: function() {
      return lua_script_1.defineScript;
    } });
    __exportStar(require_errors(), exports);
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "GeoReplyWith", { enumerable: true, get: function() {
      return generic_transformers_1.GeoReplyWith;
    } });
    var FLUSHALL_1 = require_FLUSHALL();
    Object.defineProperty(exports, "RedisFlushModes", { enumerable: true, get: function() {
      return FLUSHALL_1.RedisFlushModes;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/bloom/ADD.js
var require_ADD = __commonJS({
  "node_modules/@redis/bloom/dist/commands/bloom/ADD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, item) {
      return ["BF.ADD", key, item];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/bloom/CARD.js
var require_CARD = __commonJS({
  "node_modules/@redis/bloom/dist/commands/bloom/CARD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["BF.CARD", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/bloom/EXISTS.js
var require_EXISTS2 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/bloom/EXISTS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, item) {
      return ["BF.EXISTS", key, item];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/bloom/INFO.js
var require_INFO2 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/bloom/INFO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["BF.INFO", key];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return {
        capacity: reply[1],
        size: reply[3],
        numberOfFilters: reply[5],
        numberOfInsertedItems: reply[7],
        expansionRate: reply[9]
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/bloom/dist/commands/bloom/INSERT.js
var require_INSERT = __commonJS({
  "node_modules/@redis/bloom/dist/commands/bloom/INSERT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, items, options) {
      const args = ["BF.INSERT", key];
      if (options?.CAPACITY) {
        args.push("CAPACITY", options.CAPACITY.toString());
      }
      if (options?.ERROR) {
        args.push("ERROR", options.ERROR.toString());
      }
      if (options?.EXPANSION) {
        args.push("EXPANSION", options.EXPANSION.toString());
      }
      if (options?.NOCREATE) {
        args.push("NOCREATE");
      }
      if (options?.NONSCALING) {
        args.push("NONSCALING");
      }
      args.push("ITEMS");
      return (0, generic_transformers_1.pushVerdictArguments)(args, items);
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_2 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_2.transformBooleanArrayReply;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/bloom/LOADCHUNK.js
var require_LOADCHUNK = __commonJS({
  "node_modules/@redis/bloom/dist/commands/bloom/LOADCHUNK.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, iteretor, chunk) {
      return ["BF.LOADCHUNK", key, iteretor.toString(), chunk];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/bloom/MADD.js
var require_MADD = __commonJS({
  "node_modules/@redis/bloom/dist/commands/bloom/MADD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, items) {
      return ["BF.MADD", key, ...items];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanArrayReply;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/bloom/MEXISTS.js
var require_MEXISTS = __commonJS({
  "node_modules/@redis/bloom/dist/commands/bloom/MEXISTS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, items) {
      return ["BF.MEXISTS", key, ...items];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanArrayReply;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/bloom/RESERVE.js
var require_RESERVE = __commonJS({
  "node_modules/@redis/bloom/dist/commands/bloom/RESERVE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, errorRate, capacity, options) {
      const args = ["BF.RESERVE", key, errorRate.toString(), capacity.toString()];
      if (options?.EXPANSION) {
        args.push("EXPANSION", options.EXPANSION.toString());
      }
      if (options?.NONSCALING) {
        args.push("NONSCALING");
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/bloom/SCANDUMP.js
var require_SCANDUMP = __commonJS({
  "node_modules/@redis/bloom/dist/commands/bloom/SCANDUMP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, iterator) {
      return ["BF.SCANDUMP", key, iterator.toString()];
    }
    exports.transformArguments = transformArguments;
    function transformReply([iterator, chunk]) {
      return {
        iterator,
        chunk
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/bloom/dist/commands/bloom/index.js
var require_bloom = __commonJS({
  "node_modules/@redis/bloom/dist/commands/bloom/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ADD = require_ADD();
    var CARD = require_CARD();
    var EXISTS = require_EXISTS2();
    var INFO = require_INFO2();
    var INSERT = require_INSERT();
    var LOADCHUNK = require_LOADCHUNK();
    var MADD = require_MADD();
    var MEXISTS = require_MEXISTS();
    var RESERVE = require_RESERVE();
    var SCANDUMP = require_SCANDUMP();
    exports.default = {
      ADD,
      add: ADD,
      CARD,
      card: CARD,
      EXISTS,
      exists: EXISTS,
      INFO,
      info: INFO,
      INSERT,
      insert: INSERT,
      LOADCHUNK,
      loadChunk: LOADCHUNK,
      MADD,
      mAdd: MADD,
      MEXISTS,
      mExists: MEXISTS,
      RESERVE,
      reserve: RESERVE,
      SCANDUMP,
      scanDump: SCANDUMP
    };
  }
});

// node_modules/@redis/bloom/dist/commands/count-min-sketch/INCRBY.js
var require_INCRBY2 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/count-min-sketch/INCRBY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, items) {
      const args = ["CMS.INCRBY", key];
      if (Array.isArray(items)) {
        for (const item of items) {
          pushIncrByItem(args, item);
        }
      } else {
        pushIncrByItem(args, items);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function pushIncrByItem(args, { item, incrementBy }) {
      args.push(item, incrementBy.toString());
    }
  }
});

// node_modules/@redis/bloom/dist/commands/count-min-sketch/INFO.js
var require_INFO3 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/count-min-sketch/INFO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["CMS.INFO", key];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return {
        width: reply[1],
        depth: reply[3],
        count: reply[5]
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/bloom/dist/commands/count-min-sketch/INITBYDIM.js
var require_INITBYDIM = __commonJS({
  "node_modules/@redis/bloom/dist/commands/count-min-sketch/INITBYDIM.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, width, depth) {
      return ["CMS.INITBYDIM", key, width.toString(), depth.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/count-min-sketch/INITBYPROB.js
var require_INITBYPROB = __commonJS({
  "node_modules/@redis/bloom/dist/commands/count-min-sketch/INITBYPROB.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, error, probability) {
      return ["CMS.INITBYPROB", key, error.toString(), probability.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/count-min-sketch/MERGE.js
var require_MERGE = __commonJS({
  "node_modules/@redis/bloom/dist/commands/count-min-sketch/MERGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(dest, src) {
      const args = [
        "CMS.MERGE",
        dest,
        src.length.toString()
      ];
      if (isStringSketches(src)) {
        args.push(...src);
      } else {
        for (const sketch of src) {
          args.push(sketch.name);
        }
        args.push("WEIGHTS");
        for (const sketch of src) {
          args.push(sketch.weight.toString());
        }
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function isStringSketches(src) {
      return typeof src[0] === "string";
    }
  }
});

// node_modules/@redis/bloom/dist/commands/count-min-sketch/QUERY.js
var require_QUERY = __commonJS({
  "node_modules/@redis/bloom/dist/commands/count-min-sketch/QUERY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, items) {
      return (0, generic_transformers_1.pushVerdictArguments)(["CMS.QUERY", key], items);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/count-min-sketch/index.js
var require_count_min_sketch = __commonJS({
  "node_modules/@redis/bloom/dist/commands/count-min-sketch/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var INCRBY = require_INCRBY2();
    var INFO = require_INFO3();
    var INITBYDIM = require_INITBYDIM();
    var INITBYPROB = require_INITBYPROB();
    var MERGE = require_MERGE();
    var QUERY = require_QUERY();
    exports.default = {
      INCRBY,
      incrBy: INCRBY,
      INFO,
      info: INFO,
      INITBYDIM,
      initByDim: INITBYDIM,
      INITBYPROB,
      initByProb: INITBYPROB,
      MERGE,
      merge: MERGE,
      QUERY,
      query: QUERY
    };
  }
});

// node_modules/@redis/bloom/dist/commands/cuckoo/ADD.js
var require_ADD2 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/cuckoo/ADD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, item) {
      return ["CF.ADD", key, item];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/cuckoo/ADDNX.js
var require_ADDNX = __commonJS({
  "node_modules/@redis/bloom/dist/commands/cuckoo/ADDNX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, item) {
      return ["CF.ADDNX", key, item];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/cuckoo/COUNT.js
var require_COUNT = __commonJS({
  "node_modules/@redis/bloom/dist/commands/cuckoo/COUNT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, item) {
      return ["CF.COUNT", key, item];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/cuckoo/DEL.js
var require_DEL2 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/cuckoo/DEL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, item) {
      return ["CF.DEL", key, item];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/cuckoo/EXISTS.js
var require_EXISTS3 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/cuckoo/EXISTS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, item) {
      return ["CF.EXISTS", key, item];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/cuckoo/INFO.js
var require_INFO4 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/cuckoo/INFO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["CF.INFO", key];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return {
        size: reply[1],
        numberOfBuckets: reply[3],
        numberOfFilters: reply[5],
        numberOfInsertedItems: reply[7],
        numberOfDeletedItems: reply[9],
        bucketSize: reply[11],
        expansionRate: reply[13],
        maxIteration: reply[15]
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/bloom/dist/commands/cuckoo/INSERT.js
var require_INSERT2 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/cuckoo/INSERT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_cuckoo();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, items, options) {
      return (0, _1.pushInsertOptions)(["CF.INSERT", key], items, options);
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanArrayReply;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/cuckoo/INSERTNX.js
var require_INSERTNX = __commonJS({
  "node_modules/@redis/bloom/dist/commands/cuckoo/INSERTNX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_cuckoo();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, items, options) {
      return (0, _1.pushInsertOptions)(["CF.INSERTNX", key], items, options);
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanArrayReply;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/cuckoo/LOADCHUNK.js
var require_LOADCHUNK2 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/cuckoo/LOADCHUNK.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, iterator, chunk) {
      return ["CF.LOADCHUNK", key, iterator.toString(), chunk];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/cuckoo/RESERVE.js
var require_RESERVE2 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/cuckoo/RESERVE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, capacity, options) {
      const args = ["CF.RESERVE", key, capacity.toString()];
      if (options?.BUCKETSIZE) {
        args.push("BUCKETSIZE", options.BUCKETSIZE.toString());
      }
      if (options?.MAXITERATIONS) {
        args.push("MAXITERATIONS", options.MAXITERATIONS.toString());
      }
      if (options?.EXPANSION) {
        args.push("EXPANSION", options.EXPANSION.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/cuckoo/SCANDUMP.js
var require_SCANDUMP2 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/cuckoo/SCANDUMP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, iterator) {
      return ["CF.SCANDUMP", key, iterator.toString()];
    }
    exports.transformArguments = transformArguments;
    function transformReply([iterator, chunk]) {
      return {
        iterator,
        chunk
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/bloom/dist/commands/cuckoo/index.js
var require_cuckoo = __commonJS({
  "node_modules/@redis/bloom/dist/commands/cuckoo/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.pushInsertOptions = void 0;
    var ADD = require_ADD2();
    var ADDNX = require_ADDNX();
    var COUNT = require_COUNT();
    var DEL = require_DEL2();
    var EXISTS = require_EXISTS3();
    var INFO = require_INFO4();
    var INSERT = require_INSERT2();
    var INSERTNX = require_INSERTNX();
    var LOADCHUNK = require_LOADCHUNK2();
    var RESERVE = require_RESERVE2();
    var SCANDUMP = require_SCANDUMP2();
    var generic_transformers_1 = require_generic_transformers();
    exports.default = {
      ADD,
      add: ADD,
      ADDNX,
      addNX: ADDNX,
      COUNT,
      count: COUNT,
      DEL,
      del: DEL,
      EXISTS,
      exists: EXISTS,
      INFO,
      info: INFO,
      INSERT,
      insert: INSERT,
      INSERTNX,
      insertNX: INSERTNX,
      LOADCHUNK,
      loadChunk: LOADCHUNK,
      RESERVE,
      reserve: RESERVE,
      SCANDUMP,
      scanDump: SCANDUMP
    };
    function pushInsertOptions(args, items, options) {
      if (options?.CAPACITY) {
        args.push("CAPACITY");
        args.push(options.CAPACITY.toString());
      }
      if (options?.NOCREATE) {
        args.push("NOCREATE");
      }
      args.push("ITEMS");
      return (0, generic_transformers_1.pushVerdictArguments)(args, items);
    }
    exports.pushInsertOptions = pushInsertOptions;
  }
});

// node_modules/@redis/bloom/dist/commands/t-digest/ADD.js
var require_ADD3 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/t-digest/ADD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, values) {
      const args = ["TDIGEST.ADD", key];
      for (const item of values) {
        args.push(item.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/t-digest/BYRANK.js
var require_BYRANK = __commonJS({
  "node_modules/@redis/bloom/dist/commands/t-digest/BYRANK.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, ranks) {
      const args = ["TDIGEST.BYRANK", key];
      for (const rank of ranks) {
        args.push(rank.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    var _1 = require_t_digest();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return _1.transformDoublesReply;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/t-digest/BYREVRANK.js
var require_BYREVRANK = __commonJS({
  "node_modules/@redis/bloom/dist/commands/t-digest/BYREVRANK.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, ranks) {
      const args = ["TDIGEST.BYREVRANK", key];
      for (const rank of ranks) {
        args.push(rank.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    var _1 = require_t_digest();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return _1.transformDoublesReply;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/t-digest/CDF.js
var require_CDF = __commonJS({
  "node_modules/@redis/bloom/dist/commands/t-digest/CDF.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, values) {
      const args = ["TDIGEST.CDF", key];
      for (const item of values) {
        args.push(item.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    var _1 = require_t_digest();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return _1.transformDoublesReply;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/t-digest/CREATE.js
var require_CREATE = __commonJS({
  "node_modules/@redis/bloom/dist/commands/t-digest/CREATE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_t_digest();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, options) {
      return (0, _1.pushCompressionArgument)(["TDIGEST.CREATE", key], options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/t-digest/INFO.js
var require_INFO5 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/t-digest/INFO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return [
        "TDIGEST.INFO",
        key
      ];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return {
        comperssion: reply[1],
        capacity: reply[3],
        mergedNodes: reply[5],
        unmergedNodes: reply[7],
        mergedWeight: Number(reply[9]),
        unmergedWeight: Number(reply[11]),
        totalCompression: reply[13]
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/bloom/dist/commands/t-digest/MAX.js
var require_MAX = __commonJS({
  "node_modules/@redis/bloom/dist/commands/t-digest/MAX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return [
        "TDIGEST.MAX",
        key
      ];
    }
    exports.transformArguments = transformArguments;
    var _1 = require_t_digest();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return _1.transformDoubleReply;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/t-digest/MERGE.js
var require_MERGE2 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/t-digest/MERGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    var _1 = require_t_digest();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(destKey, srcKeys, options) {
      const args = (0, generic_transformers_1.pushVerdictArgument)(["TDIGEST.MERGE", destKey], srcKeys);
      (0, _1.pushCompressionArgument)(args, options);
      if (options?.OVERRIDE) {
        args.push("OVERRIDE");
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/t-digest/MIN.js
var require_MIN = __commonJS({
  "node_modules/@redis/bloom/dist/commands/t-digest/MIN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return [
        "TDIGEST.MIN",
        key
      ];
    }
    exports.transformArguments = transformArguments;
    var _1 = require_t_digest();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return _1.transformDoubleReply;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/t-digest/QUANTILE.js
var require_QUANTILE = __commonJS({
  "node_modules/@redis/bloom/dist/commands/t-digest/QUANTILE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, quantiles) {
      const args = [
        "TDIGEST.QUANTILE",
        key
      ];
      for (const quantile of quantiles) {
        args.push(quantile.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    var _1 = require_t_digest();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return _1.transformDoublesReply;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/t-digest/RANK.js
var require_RANK = __commonJS({
  "node_modules/@redis/bloom/dist/commands/t-digest/RANK.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, values) {
      const args = ["TDIGEST.RANK", key];
      for (const item of values) {
        args.push(item.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/t-digest/RESET.js
var require_RESET = __commonJS({
  "node_modules/@redis/bloom/dist/commands/t-digest/RESET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return ["TDIGEST.RESET", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/t-digest/REVRANK.js
var require_REVRANK = __commonJS({
  "node_modules/@redis/bloom/dist/commands/t-digest/REVRANK.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, values) {
      const args = ["TDIGEST.REVRANK", key];
      for (const item of values) {
        args.push(item.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/t-digest/TRIMMED_MEAN.js
var require_TRIMMED_MEAN = __commonJS({
  "node_modules/@redis/bloom/dist/commands/t-digest/TRIMMED_MEAN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, lowCutPercentile, highCutPercentile) {
      return [
        "TDIGEST.TRIMMED_MEAN",
        key,
        lowCutPercentile.toString(),
        highCutPercentile.toString()
      ];
    }
    exports.transformArguments = transformArguments;
    var _1 = require_t_digest();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return _1.transformDoubleReply;
    } });
  }
});

// node_modules/@redis/bloom/dist/commands/t-digest/index.js
var require_t_digest = __commonJS({
  "node_modules/@redis/bloom/dist/commands/t-digest/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformDoublesReply = exports.transformDoubleReply = exports.pushCompressionArgument = void 0;
    var ADD = require_ADD3();
    var BYRANK = require_BYRANK();
    var BYREVRANK = require_BYREVRANK();
    var CDF = require_CDF();
    var CREATE = require_CREATE();
    var INFO = require_INFO5();
    var MAX = require_MAX();
    var MERGE = require_MERGE2();
    var MIN = require_MIN();
    var QUANTILE = require_QUANTILE();
    var RANK = require_RANK();
    var RESET = require_RESET();
    var REVRANK = require_REVRANK();
    var TRIMMED_MEAN = require_TRIMMED_MEAN();
    exports.default = {
      ADD,
      add: ADD,
      BYRANK,
      byRank: BYRANK,
      BYREVRANK,
      byRevRank: BYREVRANK,
      CDF,
      cdf: CDF,
      CREATE,
      create: CREATE,
      INFO,
      info: INFO,
      MAX,
      max: MAX,
      MERGE,
      merge: MERGE,
      MIN,
      min: MIN,
      QUANTILE,
      quantile: QUANTILE,
      RANK,
      rank: RANK,
      RESET,
      reset: RESET,
      REVRANK,
      revRank: REVRANK,
      TRIMMED_MEAN,
      trimmedMean: TRIMMED_MEAN
    };
    function pushCompressionArgument(args, options) {
      if (options?.COMPRESSION) {
        args.push("COMPRESSION", options.COMPRESSION.toString());
      }
      return args;
    }
    exports.pushCompressionArgument = pushCompressionArgument;
    function transformDoubleReply(reply) {
      switch (reply) {
        case "inf":
          return Infinity;
        case "-inf":
          return -Infinity;
        case "nan":
          return NaN;
        default:
          return parseFloat(reply);
      }
    }
    exports.transformDoubleReply = transformDoubleReply;
    function transformDoublesReply(reply) {
      return reply.map(transformDoubleReply);
    }
    exports.transformDoublesReply = transformDoublesReply;
  }
});

// node_modules/@redis/bloom/dist/commands/top-k/ADD.js
var require_ADD4 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/top-k/ADD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, items) {
      return (0, generic_transformers_1.pushVerdictArguments)(["TOPK.ADD", key], items);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/top-k/COUNT.js
var require_COUNT2 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/top-k/COUNT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, items) {
      return (0, generic_transformers_1.pushVerdictArguments)(["TOPK.COUNT", key], items);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/top-k/INCRBY.js
var require_INCRBY3 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/top-k/INCRBY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, items) {
      const args = ["TOPK.INCRBY", key];
      if (Array.isArray(items)) {
        for (const item of items) {
          pushIncrByItem(args, item);
        }
      } else {
        pushIncrByItem(args, items);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function pushIncrByItem(args, { item, incrementBy }) {
      args.push(item, incrementBy.toString());
    }
  }
});

// node_modules/@redis/bloom/dist/commands/top-k/INFO.js
var require_INFO6 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/top-k/INFO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["TOPK.INFO", key];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return {
        k: reply[1],
        width: reply[3],
        depth: reply[5],
        decay: Number(reply[7])
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/bloom/dist/commands/top-k/LIST_WITHCOUNT.js
var require_LIST_WITHCOUNT = __commonJS({
  "node_modules/@redis/bloom/dist/commands/top-k/LIST_WITHCOUNT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["TOPK.LIST", key, "WITHCOUNT"];
    }
    exports.transformArguments = transformArguments;
    function transformReply(rawReply) {
      const reply = [];
      for (let i = 0; i < rawReply.length; i++) {
        reply.push({
          item: rawReply[i],
          count: rawReply[++i]
        });
      }
      return reply;
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/bloom/dist/commands/top-k/LIST.js
var require_LIST = __commonJS({
  "node_modules/@redis/bloom/dist/commands/top-k/LIST.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["TOPK.LIST", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/top-k/QUERY.js
var require_QUERY2 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/top-k/QUERY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, items) {
      return (0, generic_transformers_1.pushVerdictArguments)(["TOPK.QUERY", key], items);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/top-k/RESERVE.js
var require_RESERVE3 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/top-k/RESERVE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, topK, options) {
      const args = ["TOPK.RESERVE", key, topK.toString()];
      if (options) {
        args.push(options.width.toString(), options.depth.toString(), options.decay.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/bloom/dist/commands/top-k/index.js
var require_top_k = __commonJS({
  "node_modules/@redis/bloom/dist/commands/top-k/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ADD = require_ADD4();
    var COUNT = require_COUNT2();
    var INCRBY = require_INCRBY3();
    var INFO = require_INFO6();
    var LIST_WITHCOUNT = require_LIST_WITHCOUNT();
    var LIST = require_LIST();
    var QUERY = require_QUERY2();
    var RESERVE = require_RESERVE3();
    exports.default = {
      ADD,
      add: ADD,
      COUNT,
      count: COUNT,
      INCRBY,
      incrBy: INCRBY,
      INFO,
      info: INFO,
      LIST_WITHCOUNT,
      listWithCount: LIST_WITHCOUNT,
      LIST,
      list: LIST,
      QUERY,
      query: QUERY,
      RESERVE,
      reserve: RESERVE
    };
  }
});

// node_modules/@redis/bloom/dist/commands/index.js
var require_commands3 = __commonJS({
  "node_modules/@redis/bloom/dist/commands/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var bloom_1 = require_bloom();
    var count_min_sketch_1 = require_count_min_sketch();
    var cuckoo_1 = require_cuckoo();
    var t_digest_1 = require_t_digest();
    var top_k_1 = require_top_k();
    exports.default = {
      bf: bloom_1.default,
      cms: count_min_sketch_1.default,
      cf: cuckoo_1.default,
      tDigest: t_digest_1.default,
      topK: top_k_1.default
    };
  }
});

// node_modules/@redis/bloom/dist/index.js
var require_dist3 = __commonJS({
  "node_modules/@redis/bloom/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = void 0;
    var commands_1 = require_commands3();
    Object.defineProperty(exports, "default", { enumerable: true, get: function() {
      return commands_1.default;
    } });
  }
});

// node_modules/@redis/graph/dist/commands/CONFIG_GET.js
var require_CONFIG_GET2 = __commonJS({
  "node_modules/@redis/graph/dist/commands/CONFIG_GET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments(configKey) {
      return ["GRAPH.CONFIG", "GET", configKey];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/graph/dist/commands/CONFIG_SET.js
var require_CONFIG_SET2 = __commonJS({
  "node_modules/@redis/graph/dist/commands/CONFIG_SET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(configKey, value) {
      return [
        "GRAPH.CONFIG",
        "SET",
        configKey,
        value.toString()
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/graph/dist/commands/DELETE.js
var require_DELETE = __commonJS({
  "node_modules/@redis/graph/dist/commands/DELETE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return ["GRAPH.DELETE", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/graph/dist/commands/EXPLAIN.js
var require_EXPLAIN = __commonJS({
  "node_modules/@redis/graph/dist/commands/EXPLAIN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, query) {
      return ["GRAPH.EXPLAIN", key, query];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/graph/dist/commands/LIST.js
var require_LIST2 = __commonJS({
  "node_modules/@redis/graph/dist/commands/LIST.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments() {
      return ["GRAPH.LIST"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/graph/dist/commands/PROFILE.js
var require_PROFILE = __commonJS({
  "node_modules/@redis/graph/dist/commands/PROFILE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, query) {
      return ["GRAPH.PROFILE", key, query];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/graph/dist/commands/QUERY.js
var require_QUERY3 = __commonJS({
  "node_modules/@redis/graph/dist/commands/QUERY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands4();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(graph, query, options, compact) {
      return (0, _1.pushQueryArguments)(["GRAPH.QUERY"], graph, query, options, compact);
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return reply.length === 1 ? {
        headers: void 0,
        data: void 0,
        metadata: reply[0]
      } : {
        headers: reply[0],
        data: reply[1],
        metadata: reply[2]
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/graph/dist/commands/RO_QUERY.js
var require_RO_QUERY = __commonJS({
  "node_modules/@redis/graph/dist/commands/RO_QUERY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands4();
    var QUERY_1 = require_QUERY3();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return QUERY_1.FIRST_KEY_INDEX;
    } });
    exports.IS_READ_ONLY = true;
    function transformArguments(graph, query, options, compact) {
      return (0, _1.pushQueryArguments)(["GRAPH.RO_QUERY"], graph, query, options, compact);
    }
    exports.transformArguments = transformArguments;
    var QUERY_2 = require_QUERY3();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return QUERY_2.transformReply;
    } });
  }
});

// node_modules/@redis/graph/dist/commands/SLOWLOG.js
var require_SLOWLOG = __commonJS({
  "node_modules/@redis/graph/dist/commands/SLOWLOG.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key) {
      return ["GRAPH.SLOWLOG", key];
    }
    exports.transformArguments = transformArguments;
    function transformReply(logs) {
      return logs.map(([timestamp, command, query, took]) => ({
        timestamp: new Date(Number(timestamp) * 1e3),
        command,
        query,
        took: Number(took)
      }));
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/graph/dist/commands/index.js
var require_commands4 = __commonJS({
  "node_modules/@redis/graph/dist/commands/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.pushQueryArguments = void 0;
    var CONFIG_GET = require_CONFIG_GET2();
    var CONFIG_SET = require_CONFIG_SET2();
    var DELETE = require_DELETE();
    var EXPLAIN = require_EXPLAIN();
    var LIST = require_LIST2();
    var PROFILE = require_PROFILE();
    var QUERY = require_QUERY3();
    var RO_QUERY = require_RO_QUERY();
    var SLOWLOG = require_SLOWLOG();
    exports.default = {
      CONFIG_GET,
      configGet: CONFIG_GET,
      CONFIG_SET,
      configSet: CONFIG_SET,
      DELETE,
      delete: DELETE,
      EXPLAIN,
      explain: EXPLAIN,
      LIST,
      list: LIST,
      PROFILE,
      profile: PROFILE,
      QUERY,
      query: QUERY,
      RO_QUERY,
      roQuery: RO_QUERY,
      SLOWLOG,
      slowLog: SLOWLOG
    };
    function pushQueryArguments(args, graph, query, options, compact) {
      args.push(graph);
      if (typeof options === "number") {
        args.push(query);
        pushTimeout(args, options);
      } else {
        args.push(options?.params ? `CYPHER ${queryParamsToString(options.params)} ${query}` : query);
        if (options?.TIMEOUT !== void 0) {
          pushTimeout(args, options.TIMEOUT);
        }
      }
      if (compact) {
        args.push("--compact");
      }
      return args;
    }
    exports.pushQueryArguments = pushQueryArguments;
    function pushTimeout(args, timeout) {
      args.push("TIMEOUT", timeout.toString());
    }
    function queryParamsToString(params) {
      const parts = [];
      for (const [key, value] of Object.entries(params)) {
        parts.push(`${key}=${queryParamToString(value)}`);
      }
      return parts.join(" ");
    }
    function queryParamToString(param) {
      if (param === null) {
        return "null";
      }
      switch (typeof param) {
        case "string":
          return `"${param.replace(/["\\]/g, "\\$&")}"`;
        case "number":
        case "boolean":
          return param.toString();
      }
      if (Array.isArray(param)) {
        return `[${param.map(queryParamToString).join(",")}]`;
      } else if (typeof param === "object") {
        const body = [];
        for (const [key, value] of Object.entries(param)) {
          body.push(`${key}:${queryParamToString(value)}`);
        }
        return `{${body.join(",")}}`;
      } else {
        throw new TypeError(`Unexpected param type ${typeof param} ${param}`);
      }
    }
  }
});

// node_modules/@redis/graph/dist/graph.js
var require_graph = __commonJS({
  "node_modules/@redis/graph/dist/graph.js"(exports) {
    "use strict";
    var __classPrivateFieldSet = exports && exports.__classPrivateFieldSet || function(receiver, state, value, kind, f) {
      if (kind === "m")
        throw new TypeError("Private method is not writable");
      if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a setter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot write private member to an object whose class did not declare it");
      return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
    };
    var __classPrivateFieldGet = exports && exports.__classPrivateFieldGet || function(receiver, state, kind, f) {
      if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a getter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot read private member from an object whose class did not declare it");
      return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    };
    var _Graph_instances;
    var _Graph_client;
    var _Graph_name;
    var _Graph_metadata;
    var _Graph_setMetadataPromise;
    var _Graph_updateMetadata;
    var _Graph_setMetadata;
    var _Graph_cleanMetadataArray;
    var _Graph_getMetadata;
    var _Graph_getMetadataAsync;
    var _Graph_parseReply;
    var _Graph_parseValue;
    var _Graph_parseEdge;
    var _Graph_parseNode;
    var _Graph_parseProperties;
    Object.defineProperty(exports, "__esModule", { value: true });
    var GraphValueTypes;
    (function(GraphValueTypes2) {
      GraphValueTypes2[GraphValueTypes2["UNKNOWN"] = 0] = "UNKNOWN";
      GraphValueTypes2[GraphValueTypes2["NULL"] = 1] = "NULL";
      GraphValueTypes2[GraphValueTypes2["STRING"] = 2] = "STRING";
      GraphValueTypes2[GraphValueTypes2["INTEGER"] = 3] = "INTEGER";
      GraphValueTypes2[GraphValueTypes2["BOOLEAN"] = 4] = "BOOLEAN";
      GraphValueTypes2[GraphValueTypes2["DOUBLE"] = 5] = "DOUBLE";
      GraphValueTypes2[GraphValueTypes2["ARRAY"] = 6] = "ARRAY";
      GraphValueTypes2[GraphValueTypes2["EDGE"] = 7] = "EDGE";
      GraphValueTypes2[GraphValueTypes2["NODE"] = 8] = "NODE";
      GraphValueTypes2[GraphValueTypes2["PATH"] = 9] = "PATH";
      GraphValueTypes2[GraphValueTypes2["MAP"] = 10] = "MAP";
      GraphValueTypes2[GraphValueTypes2["POINT"] = 11] = "POINT";
    })(GraphValueTypes || (GraphValueTypes = {}));
    var Graph = class {
      constructor(client, name) {
        _Graph_instances.add(this);
        _Graph_client.set(this, void 0);
        _Graph_name.set(this, void 0);
        _Graph_metadata.set(this, void 0);
        _Graph_setMetadataPromise.set(this, void 0);
        __classPrivateFieldSet(this, _Graph_client, client, "f");
        __classPrivateFieldSet(this, _Graph_name, name, "f");
      }
      async query(query, options) {
        return __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseReply).call(this, await __classPrivateFieldGet(this, _Graph_client, "f").graph.query(__classPrivateFieldGet(this, _Graph_name, "f"), query, options, true));
      }
      async roQuery(query, options) {
        return __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseReply).call(this, await __classPrivateFieldGet(this, _Graph_client, "f").graph.roQuery(__classPrivateFieldGet(this, _Graph_name, "f"), query, options, true));
      }
    };
    exports.default = Graph;
    _Graph_client = /* @__PURE__ */ new WeakMap(), _Graph_name = /* @__PURE__ */ new WeakMap(), _Graph_metadata = /* @__PURE__ */ new WeakMap(), _Graph_setMetadataPromise = /* @__PURE__ */ new WeakMap(), _Graph_instances = /* @__PURE__ */ new WeakSet(), _Graph_updateMetadata = function _Graph_updateMetadata2() {
      __classPrivateFieldSet(this, _Graph_setMetadataPromise, __classPrivateFieldGet(this, _Graph_setMetadataPromise, "f") ?? __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_setMetadata).call(this).finally(() => __classPrivateFieldSet(this, _Graph_setMetadataPromise, void 0, "f")), "f");
      return __classPrivateFieldGet(this, _Graph_setMetadataPromise, "f");
    }, _Graph_setMetadata = // DO NOT use directly, use #updateMetadata instead
    async function _Graph_setMetadata2() {
      const [labels, relationshipTypes, propertyKeys] = await Promise.all([
        __classPrivateFieldGet(this, _Graph_client, "f").graph.roQuery(__classPrivateFieldGet(this, _Graph_name, "f"), "CALL db.labels()"),
        __classPrivateFieldGet(this, _Graph_client, "f").graph.roQuery(__classPrivateFieldGet(this, _Graph_name, "f"), "CALL db.relationshipTypes()"),
        __classPrivateFieldGet(this, _Graph_client, "f").graph.roQuery(__classPrivateFieldGet(this, _Graph_name, "f"), "CALL db.propertyKeys()")
      ]);
      __classPrivateFieldSet(this, _Graph_metadata, {
        labels: __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_cleanMetadataArray).call(this, labels.data),
        relationshipTypes: __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_cleanMetadataArray).call(this, relationshipTypes.data),
        propertyKeys: __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_cleanMetadataArray).call(this, propertyKeys.data)
      }, "f");
      return __classPrivateFieldGet(this, _Graph_metadata, "f");
    }, _Graph_cleanMetadataArray = function _Graph_cleanMetadataArray2(arr) {
      return arr.map(([value]) => value);
    }, _Graph_getMetadata = function _Graph_getMetadata2(key, id) {
      return __classPrivateFieldGet(this, _Graph_metadata, "f")?.[key][id] ?? __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_getMetadataAsync).call(this, key, id);
    }, _Graph_getMetadataAsync = // DO NOT use directly, use #getMetadata instead
    async function _Graph_getMetadataAsync2(key, id) {
      const value = (await __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_updateMetadata).call(this))[key][id];
      if (value === void 0)
        throw new Error(`Cannot find value from ${key}[${id}]`);
      return value;
    }, _Graph_parseReply = async function _Graph_parseReply2(reply) {
      if (!reply.data)
        return reply;
      const promises = [], parsed = {
        metadata: reply.metadata,
        data: reply.data.map((row) => {
          const data = {};
          for (let i = 0; i < row.length; i++) {
            data[reply.headers[i][1]] = __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseValue).call(this, row[i], promises);
          }
          return data;
        })
      };
      if (promises.length)
        await Promise.all(promises);
      return parsed;
    }, _Graph_parseValue = function _Graph_parseValue2([valueType, value], promises) {
      switch (valueType) {
        case GraphValueTypes.NULL:
          return null;
        case GraphValueTypes.STRING:
        case GraphValueTypes.INTEGER:
          return value;
        case GraphValueTypes.BOOLEAN:
          return value === "true";
        case GraphValueTypes.DOUBLE:
          return parseFloat(value);
        case GraphValueTypes.ARRAY:
          return value.map((x) => __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseValue2).call(this, x, promises));
        case GraphValueTypes.EDGE:
          return __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseEdge).call(this, value, promises);
        case GraphValueTypes.NODE:
          return __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseNode).call(this, value, promises);
        case GraphValueTypes.PATH:
          return {
            nodes: value[0][1].map(([, node]) => __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseNode).call(this, node, promises)),
            edges: value[1][1].map(([, edge]) => __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseEdge).call(this, edge, promises))
          };
        case GraphValueTypes.MAP:
          const map = {};
          for (let i = 0; i < value.length; i++) {
            map[value[i++]] = __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseValue2).call(this, value[i], promises);
          }
          return map;
        case GraphValueTypes.POINT:
          return {
            latitude: parseFloat(value[0]),
            longitude: parseFloat(value[1])
          };
        default:
          throw new Error(`unknown scalar type: ${valueType}`);
      }
    }, _Graph_parseEdge = function _Graph_parseEdge2([id, relationshipTypeId, sourceId, destinationId, properties], promises) {
      const edge = {
        id,
        sourceId,
        destinationId,
        properties: __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseProperties).call(this, properties, promises)
      };
      const relationshipType = __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_getMetadata).call(this, "relationshipTypes", relationshipTypeId);
      if (relationshipType instanceof Promise) {
        promises.push(relationshipType.then((value) => edge.relationshipType = value));
      } else {
        edge.relationshipType = relationshipType;
      }
      return edge;
    }, _Graph_parseNode = function _Graph_parseNode2([id, labelIds, properties], promises) {
      const labels = new Array(labelIds.length);
      for (let i = 0; i < labelIds.length; i++) {
        const value = __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_getMetadata).call(this, "labels", labelIds[i]);
        if (value instanceof Promise) {
          promises.push(value.then((value2) => labels[i] = value2));
        } else {
          labels[i] = value;
        }
      }
      return {
        id,
        labels,
        properties: __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseProperties).call(this, properties, promises)
      };
    }, _Graph_parseProperties = function _Graph_parseProperties2(raw, promises) {
      const parsed = {};
      for (const [id, type, value] of raw) {
        const parsedValue = __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseValue).call(this, [type, value], promises), key = __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_getMetadata).call(this, "propertyKeys", id);
        if (key instanceof Promise) {
          promises.push(key.then((key2) => parsed[key2] = parsedValue));
        } else {
          parsed[key] = parsedValue;
        }
      }
      return parsed;
    };
  }
});

// node_modules/@redis/graph/dist/index.js
var require_dist4 = __commonJS({
  "node_modules/@redis/graph/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Graph = exports.default = void 0;
    var commands_1 = require_commands4();
    Object.defineProperty(exports, "default", { enumerable: true, get: function() {
      return commands_1.default;
    } });
    var graph_1 = require_graph();
    Object.defineProperty(exports, "Graph", { enumerable: true, get: function() {
      return graph_1.default;
    } });
  }
});

// node_modules/@redis/json/dist/commands/ARRAPPEND.js
var require_ARRAPPEND = __commonJS({
  "node_modules/@redis/json/dist/commands/ARRAPPEND.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands5();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, path, ...jsons) {
      const args = ["JSON.ARRAPPEND", key, path];
      for (const json of jsons) {
        args.push((0, _1.transformRedisJsonArgument)(json));
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/json/dist/commands/ARRINDEX.js
var require_ARRINDEX = __commonJS({
  "node_modules/@redis/json/dist/commands/ARRINDEX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands5();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, path, json, start, stop) {
      const args = ["JSON.ARRINDEX", key, path, (0, _1.transformRedisJsonArgument)(json)];
      if (start !== void 0 && start !== null) {
        args.push(start.toString());
        if (stop !== void 0 && stop !== null) {
          args.push(stop.toString());
        }
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/json/dist/commands/ARRINSERT.js
var require_ARRINSERT = __commonJS({
  "node_modules/@redis/json/dist/commands/ARRINSERT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands5();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, path, index, ...jsons) {
      const args = ["JSON.ARRINSERT", key, path, index.toString()];
      for (const json of jsons) {
        args.push((0, _1.transformRedisJsonArgument)(json));
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/json/dist/commands/ARRLEN.js
var require_ARRLEN = __commonJS({
  "node_modules/@redis/json/dist/commands/ARRLEN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, path) {
      const args = ["JSON.ARRLEN", key];
      if (path) {
        args.push(path);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/json/dist/commands/ARRPOP.js
var require_ARRPOP = __commonJS({
  "node_modules/@redis/json/dist/commands/ARRPOP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands5();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, path, index) {
      const args = ["JSON.ARRPOP", key];
      if (path) {
        args.push(path);
        if (index !== void 0 && index !== null) {
          args.push(index.toString());
        }
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      if (reply === null)
        return null;
      if (Array.isArray(reply)) {
        return reply.map(_1.transformRedisJsonNullReply);
      }
      return (0, _1.transformRedisJsonNullReply)(reply);
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/json/dist/commands/ARRTRIM.js
var require_ARRTRIM = __commonJS({
  "node_modules/@redis/json/dist/commands/ARRTRIM.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, path, start, stop) {
      return ["JSON.ARRTRIM", key, path, start.toString(), stop.toString()];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/json/dist/commands/DEBUG_MEMORY.js
var require_DEBUG_MEMORY = __commonJS({
  "node_modules/@redis/json/dist/commands/DEBUG_MEMORY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 2;
    function transformArguments(key, path) {
      const args = ["JSON.DEBUG", "MEMORY", key];
      if (path) {
        args.push(path);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/json/dist/commands/DEL.js
var require_DEL3 = __commonJS({
  "node_modules/@redis/json/dist/commands/DEL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, path) {
      const args = ["JSON.DEL", key];
      if (path) {
        args.push(path);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/json/dist/commands/FORGET.js
var require_FORGET = __commonJS({
  "node_modules/@redis/json/dist/commands/FORGET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, path) {
      const args = ["JSON.FORGET", key];
      if (path) {
        args.push(path);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/json/dist/commands/GET.js
var require_GET2 = __commonJS({
  "node_modules/@redis/json/dist/commands/GET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, options) {
      let args = ["JSON.GET", key];
      if (options?.path) {
        args = (0, generic_transformers_1.pushVerdictArguments)(args, options.path);
      }
      if (options?.INDENT) {
        args.push("INDENT", options.INDENT);
      }
      if (options?.NEWLINE) {
        args.push("NEWLINE", options.NEWLINE);
      }
      if (options?.SPACE) {
        args.push("SPACE", options.SPACE);
      }
      if (options?.NOESCAPE) {
        args.push("NOESCAPE");
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    var _1 = require_commands5();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return _1.transformRedisJsonNullReply;
    } });
  }
});

// node_modules/@redis/json/dist/commands/MERGE.js
var require_MERGE3 = __commonJS({
  "node_modules/@redis/json/dist/commands/MERGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands5();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, path, json) {
      return ["JSON.MERGE", key, path, (0, _1.transformRedisJsonArgument)(json)];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/json/dist/commands/MGET.js
var require_MGET2 = __commonJS({
  "node_modules/@redis/json/dist/commands/MGET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands5();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(keys, path) {
      return [
        "JSON.MGET",
        ...keys,
        path
      ];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return reply.map(_1.transformRedisJsonNullReply);
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/json/dist/commands/MSET.js
var require_MSET2 = __commonJS({
  "node_modules/@redis/json/dist/commands/MSET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands5();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(items) {
      const args = new Array(1 + items.length * 3);
      args[0] = "JSON.MSET";
      let argsIndex = 1;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        args[argsIndex++] = item.key;
        args[argsIndex++] = item.path;
        args[argsIndex++] = (0, _1.transformRedisJsonArgument)(item.value);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/json/dist/commands/NUMINCRBY.js
var require_NUMINCRBY = __commonJS({
  "node_modules/@redis/json/dist/commands/NUMINCRBY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, path, by) {
      return ["JSON.NUMINCRBY", key, path, by.toString()];
    }
    exports.transformArguments = transformArguments;
    var _1 = require_commands5();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return _1.transformNumbersReply;
    } });
  }
});

// node_modules/@redis/json/dist/commands/NUMMULTBY.js
var require_NUMMULTBY = __commonJS({
  "node_modules/@redis/json/dist/commands/NUMMULTBY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, path, by) {
      return ["JSON.NUMMULTBY", key, path, by.toString()];
    }
    exports.transformArguments = transformArguments;
    var _1 = require_commands5();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return _1.transformNumbersReply;
    } });
  }
});

// node_modules/@redis/json/dist/commands/OBJKEYS.js
var require_OBJKEYS = __commonJS({
  "node_modules/@redis/json/dist/commands/OBJKEYS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, path) {
      const args = ["JSON.OBJKEYS", key];
      if (path) {
        args.push(path);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/json/dist/commands/OBJLEN.js
var require_OBJLEN = __commonJS({
  "node_modules/@redis/json/dist/commands/OBJLEN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, path) {
      const args = ["JSON.OBJLEN", key];
      if (path) {
        args.push(path);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/json/dist/commands/RESP.js
var require_RESP = __commonJS({
  "node_modules/@redis/json/dist/commands/RESP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, path) {
      const args = ["JSON.RESP", key];
      if (path) {
        args.push(path);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/json/dist/commands/SET.js
var require_SET2 = __commonJS({
  "node_modules/@redis/json/dist/commands/SET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands5();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, path, json, options) {
      const args = ["JSON.SET", key, path, (0, _1.transformRedisJsonArgument)(json)];
      if (options?.NX) {
        args.push("NX");
      } else if (options?.XX) {
        args.push("XX");
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/json/dist/commands/STRAPPEND.js
var require_STRAPPEND = __commonJS({
  "node_modules/@redis/json/dist/commands/STRAPPEND.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands5();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(...[key, pathOrAppend, append]) {
      const args = ["JSON.STRAPPEND", key];
      if (append !== void 0 && append !== null) {
        args.push(pathOrAppend, (0, _1.transformRedisJsonArgument)(append));
      } else {
        args.push((0, _1.transformRedisJsonArgument)(pathOrAppend));
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/json/dist/commands/STRLEN.js
var require_STRLEN2 = __commonJS({
  "node_modules/@redis/json/dist/commands/STRLEN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, path) {
      const args = ["JSON.STRLEN", key];
      if (path) {
        args.push(path);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/json/dist/commands/TYPE.js
var require_TYPE2 = __commonJS({
  "node_modules/@redis/json/dist/commands/TYPE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, path) {
      const args = ["JSON.TYPE", key];
      if (path) {
        args.push(path);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/json/dist/commands/index.js
var require_commands5 = __commonJS({
  "node_modules/@redis/json/dist/commands/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformNumbersReply = exports.transformRedisJsonNullReply = exports.transformRedisJsonReply = exports.transformRedisJsonArgument = void 0;
    var ARRAPPEND = require_ARRAPPEND();
    var ARRINDEX = require_ARRINDEX();
    var ARRINSERT = require_ARRINSERT();
    var ARRLEN = require_ARRLEN();
    var ARRPOP = require_ARRPOP();
    var ARRTRIM = require_ARRTRIM();
    var DEBUG_MEMORY = require_DEBUG_MEMORY();
    var DEL = require_DEL3();
    var FORGET = require_FORGET();
    var GET = require_GET2();
    var MERGE = require_MERGE3();
    var MGET = require_MGET2();
    var MSET = require_MSET2();
    var NUMINCRBY = require_NUMINCRBY();
    var NUMMULTBY = require_NUMMULTBY();
    var OBJKEYS = require_OBJKEYS();
    var OBJLEN = require_OBJLEN();
    var RESP = require_RESP();
    var SET = require_SET2();
    var STRAPPEND = require_STRAPPEND();
    var STRLEN = require_STRLEN2();
    var TYPE = require_TYPE2();
    exports.default = {
      ARRAPPEND,
      arrAppend: ARRAPPEND,
      ARRINDEX,
      arrIndex: ARRINDEX,
      ARRINSERT,
      arrInsert: ARRINSERT,
      ARRLEN,
      arrLen: ARRLEN,
      ARRPOP,
      arrPop: ARRPOP,
      ARRTRIM,
      arrTrim: ARRTRIM,
      DEBUG_MEMORY,
      debugMemory: DEBUG_MEMORY,
      DEL,
      del: DEL,
      FORGET,
      forget: FORGET,
      GET,
      get: GET,
      MERGE,
      merge: MERGE,
      MGET,
      mGet: MGET,
      MSET,
      mSet: MSET,
      NUMINCRBY,
      numIncrBy: NUMINCRBY,
      NUMMULTBY,
      numMultBy: NUMMULTBY,
      OBJKEYS,
      objKeys: OBJKEYS,
      OBJLEN,
      objLen: OBJLEN,
      RESP,
      resp: RESP,
      SET,
      set: SET,
      STRAPPEND,
      strAppend: STRAPPEND,
      STRLEN,
      strLen: STRLEN,
      TYPE,
      type: TYPE
    };
    function transformRedisJsonArgument(json) {
      return JSON.stringify(json);
    }
    exports.transformRedisJsonArgument = transformRedisJsonArgument;
    function transformRedisJsonReply(json) {
      return JSON.parse(json);
    }
    exports.transformRedisJsonReply = transformRedisJsonReply;
    function transformRedisJsonNullReply(json) {
      if (json === null)
        return null;
      return transformRedisJsonReply(json);
    }
    exports.transformRedisJsonNullReply = transformRedisJsonNullReply;
    function transformNumbersReply(reply) {
      return JSON.parse(reply);
    }
    exports.transformNumbersReply = transformNumbersReply;
  }
});

// node_modules/@redis/json/dist/index.js
var require_dist5 = __commonJS({
  "node_modules/@redis/json/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = void 0;
    var commands_1 = require_commands5();
    Object.defineProperty(exports, "default", { enumerable: true, get: function() {
      return commands_1.default;
    } });
  }
});

// node_modules/@redis/search/dist/commands/_LIST.js
var require_LIST3 = __commonJS({
  "node_modules/@redis/search/dist/commands/_LIST.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments() {
      return ["FT._LIST"];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/ALTER.js
var require_ALTER = __commonJS({
  "node_modules/@redis/search/dist/commands/ALTER.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    var _1 = require_commands6();
    function transformArguments(index, schema) {
      const args = ["FT.ALTER", index, "SCHEMA", "ADD"];
      (0, _1.pushSchema)(args, schema);
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/AGGREGATE.js
var require_AGGREGATE = __commonJS({
  "node_modules/@redis/search/dist/commands/AGGREGATE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.pushAggregatehOptions = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = exports.AggregateGroupByReducers = exports.AggregateSteps = void 0;
    var generic_transformers_1 = require_generic_transformers();
    var _1 = require_commands6();
    var AggregateSteps;
    (function(AggregateSteps2) {
      AggregateSteps2["GROUPBY"] = "GROUPBY";
      AggregateSteps2["SORTBY"] = "SORTBY";
      AggregateSteps2["APPLY"] = "APPLY";
      AggregateSteps2["LIMIT"] = "LIMIT";
      AggregateSteps2["FILTER"] = "FILTER";
    })(AggregateSteps || (exports.AggregateSteps = AggregateSteps = {}));
    var AggregateGroupByReducers;
    (function(AggregateGroupByReducers2) {
      AggregateGroupByReducers2["COUNT"] = "COUNT";
      AggregateGroupByReducers2["COUNT_DISTINCT"] = "COUNT_DISTINCT";
      AggregateGroupByReducers2["COUNT_DISTINCTISH"] = "COUNT_DISTINCTISH";
      AggregateGroupByReducers2["SUM"] = "SUM";
      AggregateGroupByReducers2["MIN"] = "MIN";
      AggregateGroupByReducers2["MAX"] = "MAX";
      AggregateGroupByReducers2["AVG"] = "AVG";
      AggregateGroupByReducers2["STDDEV"] = "STDDEV";
      AggregateGroupByReducers2["QUANTILE"] = "QUANTILE";
      AggregateGroupByReducers2["TOLIST"] = "TOLIST";
      AggregateGroupByReducers2["TO_LIST"] = "TOLIST";
      AggregateGroupByReducers2["FIRST_VALUE"] = "FIRST_VALUE";
      AggregateGroupByReducers2["RANDOM_SAMPLE"] = "RANDOM_SAMPLE";
    })(AggregateGroupByReducers || (exports.AggregateGroupByReducers = AggregateGroupByReducers = {}));
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(index, query, options) {
      return pushAggregatehOptions(["FT.AGGREGATE", index, query], options);
    }
    exports.transformArguments = transformArguments;
    function pushAggregatehOptions(args, options) {
      if (options?.VERBATIM) {
        args.push("VERBATIM");
      }
      if (options?.LOAD) {
        args.push("LOAD");
        (0, _1.pushArgumentsWithLength)(args, () => {
          if (Array.isArray(options.LOAD)) {
            for (const load of options.LOAD) {
              pushLoadField(args, load);
            }
          } else {
            pushLoadField(args, options.LOAD);
          }
        });
      }
      if (options?.STEPS) {
        for (const step of options.STEPS) {
          switch (step.type) {
            case AggregateSteps.GROUPBY:
              args.push("GROUPBY");
              if (!step.properties) {
                args.push("0");
              } else {
                (0, generic_transformers_1.pushVerdictArgument)(args, step.properties);
              }
              if (Array.isArray(step.REDUCE)) {
                for (const reducer of step.REDUCE) {
                  pushGroupByReducer(args, reducer);
                }
              } else {
                pushGroupByReducer(args, step.REDUCE);
              }
              break;
            case AggregateSteps.SORTBY:
              (0, _1.pushSortByArguments)(args, "SORTBY", step.BY);
              if (step.MAX) {
                args.push("MAX", step.MAX.toString());
              }
              break;
            case AggregateSteps.APPLY:
              args.push("APPLY", step.expression, "AS", step.AS);
              break;
            case AggregateSteps.LIMIT:
              args.push("LIMIT", step.from.toString(), step.size.toString());
              break;
            case AggregateSteps.FILTER:
              args.push("FILTER", step.expression);
              break;
          }
        }
      }
      (0, _1.pushParamsArgs)(args, options?.PARAMS);
      if (options?.DIALECT) {
        args.push("DIALECT", options.DIALECT.toString());
      }
      if (options?.TIMEOUT !== void 0) {
        args.push("TIMEOUT", options.TIMEOUT.toString());
      }
      return args;
    }
    exports.pushAggregatehOptions = pushAggregatehOptions;
    function pushLoadField(args, toLoad) {
      if (typeof toLoad === "string") {
        args.push(toLoad);
      } else {
        args.push(toLoad.identifier);
        if (toLoad.AS) {
          args.push("AS", toLoad.AS);
        }
      }
    }
    function pushGroupByReducer(args, reducer) {
      args.push("REDUCE", reducer.type);
      switch (reducer.type) {
        case AggregateGroupByReducers.COUNT:
          args.push("0");
          break;
        case AggregateGroupByReducers.COUNT_DISTINCT:
        case AggregateGroupByReducers.COUNT_DISTINCTISH:
        case AggregateGroupByReducers.SUM:
        case AggregateGroupByReducers.MIN:
        case AggregateGroupByReducers.MAX:
        case AggregateGroupByReducers.AVG:
        case AggregateGroupByReducers.STDDEV:
        case AggregateGroupByReducers.TOLIST:
          args.push("1", reducer.property);
          break;
        case AggregateGroupByReducers.QUANTILE:
          args.push("2", reducer.property, reducer.quantile.toString());
          break;
        case AggregateGroupByReducers.FIRST_VALUE: {
          (0, _1.pushArgumentsWithLength)(args, () => {
            args.push(reducer.property);
            if (reducer.BY) {
              args.push("BY");
              if (typeof reducer.BY === "string") {
                args.push(reducer.BY);
              } else {
                args.push(reducer.BY.property);
                if (reducer.BY.direction) {
                  args.push(reducer.BY.direction);
                }
              }
            }
          });
          break;
        }
        case AggregateGroupByReducers.RANDOM_SAMPLE:
          args.push("2", reducer.property, reducer.sampleSize.toString());
          break;
      }
      if (reducer.AS) {
        args.push("AS", reducer.AS);
      }
    }
    function transformReply(rawReply) {
      const results = [];
      for (let i = 1; i < rawReply.length; i++) {
        results.push((0, generic_transformers_1.transformTuplesReply)(rawReply[i]));
      }
      return {
        total: rawReply[0],
        results
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/search/dist/commands/AGGREGATE_WITHCURSOR.js
var require_AGGREGATE_WITHCURSOR = __commonJS({
  "node_modules/@redis/search/dist/commands/AGGREGATE_WITHCURSOR.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var AGGREGATE_1 = require_AGGREGATE();
    var AGGREGATE_2 = require_AGGREGATE();
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return AGGREGATE_2.FIRST_KEY_INDEX;
    } });
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return AGGREGATE_2.IS_READ_ONLY;
    } });
    function transformArguments(index, query, options) {
      const args = (0, AGGREGATE_1.transformArguments)(index, query, options);
      args.push("WITHCURSOR");
      if (options?.COUNT) {
        args.push("COUNT", options.COUNT.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return {
        ...(0, AGGREGATE_1.transformReply)(reply[0]),
        cursor: reply[1]
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/search/dist/commands/ALIASADD.js
var require_ALIASADD = __commonJS({
  "node_modules/@redis/search/dist/commands/ALIASADD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(name, index) {
      return ["FT.ALIASADD", name, index];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/ALIASDEL.js
var require_ALIASDEL = __commonJS({
  "node_modules/@redis/search/dist/commands/ALIASDEL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(name, index) {
      return ["FT.ALIASDEL", name, index];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/ALIASUPDATE.js
var require_ALIASUPDATE = __commonJS({
  "node_modules/@redis/search/dist/commands/ALIASUPDATE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(name, index) {
      return ["FT.ALIASUPDATE", name, index];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/CONFIG_GET.js
var require_CONFIG_GET3 = __commonJS({
  "node_modules/@redis/search/dist/commands/CONFIG_GET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = void 0;
    function transformArguments(option) {
      return ["FT.CONFIG", "GET", option];
    }
    exports.transformArguments = transformArguments;
    function transformReply(rawReply) {
      const transformedReply = /* @__PURE__ */ Object.create(null);
      for (const [key, value] of rawReply) {
        transformedReply[key] = value;
      }
      return transformedReply;
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/search/dist/commands/CONFIG_SET.js
var require_CONFIG_SET3 = __commonJS({
  "node_modules/@redis/search/dist/commands/CONFIG_SET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(option, value) {
      return ["FT.CONFIG", "SET", option, value];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/CREATE.js
var require_CREATE2 = __commonJS({
  "node_modules/@redis/search/dist/commands/CREATE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    var generic_transformers_1 = require_generic_transformers();
    var _1 = require_commands6();
    function transformArguments(index, schema, options) {
      const args = ["FT.CREATE", index];
      if (options?.ON) {
        args.push("ON", options.ON);
      }
      (0, generic_transformers_1.pushOptionalVerdictArgument)(args, "PREFIX", options?.PREFIX);
      if (options?.FILTER) {
        args.push("FILTER", options.FILTER);
      }
      if (options?.LANGUAGE) {
        args.push("LANGUAGE", options.LANGUAGE);
      }
      if (options?.LANGUAGE_FIELD) {
        args.push("LANGUAGE_FIELD", options.LANGUAGE_FIELD);
      }
      if (options?.SCORE) {
        args.push("SCORE", options.SCORE.toString());
      }
      if (options?.SCORE_FIELD) {
        args.push("SCORE_FIELD", options.SCORE_FIELD);
      }
      if (options?.MAXTEXTFIELDS) {
        args.push("MAXTEXTFIELDS");
      }
      if (options?.TEMPORARY) {
        args.push("TEMPORARY", options.TEMPORARY.toString());
      }
      if (options?.NOOFFSETS) {
        args.push("NOOFFSETS");
      }
      if (options?.NOHL) {
        args.push("NOHL");
      }
      if (options?.NOFIELDS) {
        args.push("NOFIELDS");
      }
      if (options?.NOFREQS) {
        args.push("NOFREQS");
      }
      if (options?.SKIPINITIALSCAN) {
        args.push("SKIPINITIALSCAN");
      }
      (0, generic_transformers_1.pushOptionalVerdictArgument)(args, "STOPWORDS", options?.STOPWORDS);
      args.push("SCHEMA");
      (0, _1.pushSchema)(args, schema);
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/CURSOR_DEL.js
var require_CURSOR_DEL = __commonJS({
  "node_modules/@redis/search/dist/commands/CURSOR_DEL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(index, cursorId) {
      return [
        "FT.CURSOR",
        "DEL",
        index,
        cursorId.toString()
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/CURSOR_READ.js
var require_CURSOR_READ = __commonJS({
  "node_modules/@redis/search/dist/commands/CURSOR_READ.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(index, cursor, options) {
      const args = [
        "FT.CURSOR",
        "READ",
        index,
        cursor.toString()
      ];
      if (options?.COUNT) {
        args.push("COUNT", options.COUNT.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    var AGGREGATE_WITHCURSOR_1 = require_AGGREGATE_WITHCURSOR();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return AGGREGATE_WITHCURSOR_1.transformReply;
    } });
  }
});

// node_modules/@redis/search/dist/commands/DICTADD.js
var require_DICTADD = __commonJS({
  "node_modules/@redis/search/dist/commands/DICTADD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    var generic_transformers_1 = require_generic_transformers();
    function transformArguments(dictionary, term) {
      return (0, generic_transformers_1.pushVerdictArguments)(["FT.DICTADD", dictionary], term);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/DICTDEL.js
var require_DICTDEL = __commonJS({
  "node_modules/@redis/search/dist/commands/DICTDEL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    var generic_transformers_1 = require_generic_transformers();
    function transformArguments(dictionary, term) {
      return (0, generic_transformers_1.pushVerdictArguments)(["FT.DICTDEL", dictionary], term);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/DICTDUMP.js
var require_DICTDUMP = __commonJS({
  "node_modules/@redis/search/dist/commands/DICTDUMP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(dictionary) {
      return ["FT.DICTDUMP", dictionary];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/DROPINDEX.js
var require_DROPINDEX = __commonJS({
  "node_modules/@redis/search/dist/commands/DROPINDEX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(index, options) {
      const args = ["FT.DROPINDEX", index];
      if (options?.DD) {
        args.push("DD");
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/EXPLAIN.js
var require_EXPLAIN2 = __commonJS({
  "node_modules/@redis/search/dist/commands/EXPLAIN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var _1 = require_commands6();
    exports.IS_READ_ONLY = true;
    function transformArguments(index, query, options) {
      const args = ["FT.EXPLAIN", index, query];
      (0, _1.pushParamsArgs)(args, options?.PARAMS);
      if (options?.DIALECT) {
        args.push("DIALECT", options.DIALECT.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/EXPLAINCLI.js
var require_EXPLAINCLI = __commonJS({
  "node_modules/@redis/search/dist/commands/EXPLAINCLI.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments(index, query) {
      return ["FT.EXPLAINCLI", index, query];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/INFO.js
var require_INFO7 = __commonJS({
  "node_modules/@redis/search/dist/commands/INFO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = void 0;
    var generic_transformers_1 = require_generic_transformers();
    function transformArguments(index) {
      return ["FT.INFO", index];
    }
    exports.transformArguments = transformArguments;
    function transformReply(rawReply) {
      return {
        indexName: rawReply[1],
        indexOptions: rawReply[3],
        indexDefinition: (0, generic_transformers_1.transformTuplesReply)(rawReply[5]),
        attributes: rawReply[7].map((attribute) => (0, generic_transformers_1.transformTuplesReply)(attribute)),
        numDocs: rawReply[9],
        maxDocId: rawReply[11],
        numTerms: rawReply[13],
        numRecords: rawReply[15],
        invertedSzMb: rawReply[17],
        vectorIndexSzMb: rawReply[19],
        totalInvertedIndexBlocks: rawReply[21],
        offsetVectorsSzMb: rawReply[23],
        docTableSizeMb: rawReply[25],
        sortableValuesSizeMb: rawReply[27],
        keyTableSizeMb: rawReply[29],
        recordsPerDocAvg: rawReply[31],
        bytesPerRecordAvg: rawReply[33],
        offsetsPerTermAvg: rawReply[35],
        offsetBitsPerRecordAvg: rawReply[37],
        hashIndexingFailures: rawReply[39],
        indexing: rawReply[41],
        percentIndexed: rawReply[43],
        gcStats: {
          bytesCollected: rawReply[45][1],
          totalMsRun: rawReply[45][3],
          totalCycles: rawReply[45][5],
          averageCycleTimeMs: rawReply[45][7],
          lastRunTimeMs: rawReply[45][9],
          gcNumericTreesMissed: rawReply[45][11],
          gcBlocksDenied: rawReply[45][13]
        },
        cursorStats: {
          globalIdle: rawReply[47][1],
          globalTotal: rawReply[47][3],
          indexCapacity: rawReply[47][5],
          idnexTotal: rawReply[47][7]
        },
        stopWords: rawReply[49]
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/search/dist/commands/SEARCH.js
var require_SEARCH = __commonJS({
  "node_modules/@redis/search/dist/commands/SEARCH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands6();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(index, query, options) {
      return (0, _1.pushSearchOptions)(["FT.SEARCH", index, query], options);
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply, withoutDocuments) {
      const documents = [];
      let i = 1;
      while (i < reply.length) {
        documents.push({
          id: reply[i++],
          value: withoutDocuments ? /* @__PURE__ */ Object.create(null) : documentValue(reply[i++])
        });
      }
      return {
        total: reply[0],
        documents
      };
    }
    exports.transformReply = transformReply;
    function documentValue(tuples) {
      const message = /* @__PURE__ */ Object.create(null);
      let i = 0;
      while (i < tuples.length) {
        const key = tuples[i++], value = tuples[i++];
        if (key === "$") {
          try {
            Object.assign(message, JSON.parse(value));
            continue;
          } catch {
          }
        }
        message[key] = value;
      }
      return message;
    }
  }
});

// node_modules/@redis/search/dist/commands/PROFILE_SEARCH.js
var require_PROFILE_SEARCH = __commonJS({
  "node_modules/@redis/search/dist/commands/PROFILE_SEARCH.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var SEARCH_1 = require_SEARCH();
    var _1 = require_commands6();
    exports.IS_READ_ONLY = true;
    function transformArguments(index, query, options) {
      let args = ["FT.PROFILE", index, "SEARCH"];
      if (options?.LIMITED) {
        args.push("LIMITED");
      }
      args.push("QUERY", query);
      return (0, _1.pushSearchOptions)(args, options);
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply, withoutDocuments) {
      return {
        results: (0, SEARCH_1.transformReply)(reply[0], withoutDocuments),
        profile: (0, _1.transformProfile)(reply[1])
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/search/dist/commands/PROFILE_AGGREGATE.js
var require_PROFILE_AGGREGATE = __commonJS({
  "node_modules/@redis/search/dist/commands/PROFILE_AGGREGATE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var AGGREGATE_1 = require_AGGREGATE();
    var _1 = require_commands6();
    exports.IS_READ_ONLY = true;
    function transformArguments(index, query, options) {
      const args = ["FT.PROFILE", index, "AGGREGATE"];
      if (options?.LIMITED) {
        args.push("LIMITED");
      }
      args.push("QUERY", query);
      (0, AGGREGATE_1.pushAggregatehOptions)(args, options);
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return {
        results: (0, AGGREGATE_1.transformReply)(reply[0]),
        profile: (0, _1.transformProfile)(reply[1])
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/search/dist/commands/SEARCH_NOCONTENT.js
var require_SEARCH_NOCONTENT = __commonJS({
  "node_modules/@redis/search/dist/commands/SEARCH_NOCONTENT.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands6();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(index, query, options) {
      return (0, _1.pushSearchOptions)(["FT.SEARCH", index, query, "NOCONTENT"], options);
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return {
        total: reply[0],
        documents: reply.slice(1)
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/search/dist/commands/SPELLCHECK.js
var require_SPELLCHECK = __commonJS({
  "node_modules/@redis/search/dist/commands/SPELLCHECK.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = void 0;
    function transformArguments(index, query, options) {
      const args = ["FT.SPELLCHECK", index, query];
      if (options?.DISTANCE) {
        args.push("DISTANCE", options.DISTANCE.toString());
      }
      if (options?.TERMS) {
        if (Array.isArray(options.TERMS)) {
          for (const term of options.TERMS) {
            pushTerms(args, term);
          }
        } else {
          pushTerms(args, options.TERMS);
        }
      }
      if (options?.DIALECT) {
        args.push("DIALECT", options.DIALECT.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
    function pushTerms(args, { mode, dictionary }) {
      args.push("TERMS", mode, dictionary);
    }
    function transformReply(rawReply) {
      return rawReply.map(([, term, suggestions]) => ({
        term,
        suggestions: suggestions.map(([score, suggestion]) => ({
          score: Number(score),
          suggestion
        }))
      }));
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/search/dist/commands/SUGADD.js
var require_SUGADD = __commonJS({
  "node_modules/@redis/search/dist/commands/SUGADD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(key, string, score, options) {
      const args = ["FT.SUGADD", key, string, score.toString()];
      if (options?.INCR) {
        args.push("INCR");
      }
      if (options?.PAYLOAD) {
        args.push("PAYLOAD", options.PAYLOAD);
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/SUGDEL.js
var require_SUGDEL = __commonJS({
  "node_modules/@redis/search/dist/commands/SUGDEL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = void 0;
    function transformArguments(key, string) {
      return ["FT.SUGDEL", key, string];
    }
    exports.transformArguments = transformArguments;
    var generic_transformers_1 = require_generic_transformers();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return generic_transformers_1.transformBooleanReply;
    } });
  }
});

// node_modules/@redis/search/dist/commands/SUGGET.js
var require_SUGGET = __commonJS({
  "node_modules/@redis/search/dist/commands/SUGGET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, prefix, options) {
      const args = ["FT.SUGGET", key, prefix];
      if (options?.FUZZY) {
        args.push("FUZZY");
      }
      if (options?.MAX) {
        args.push("MAX", options.MAX.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/SUGGET_WITHPAYLOADS.js
var require_SUGGET_WITHPAYLOADS = __commonJS({
  "node_modules/@redis/search/dist/commands/SUGGET_WITHPAYLOADS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var SUGGET_1 = require_SUGGET();
    var SUGGET_2 = require_SUGGET();
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return SUGGET_2.IS_READ_ONLY;
    } });
    function transformArguments(key, prefix, options) {
      return [
        ...(0, SUGGET_1.transformArguments)(key, prefix, options),
        "WITHPAYLOADS"
      ];
    }
    exports.transformArguments = transformArguments;
    function transformReply(rawReply) {
      if (rawReply === null)
        return null;
      const transformedReply = [];
      for (let i = 0; i < rawReply.length; i += 2) {
        transformedReply.push({
          suggestion: rawReply[i],
          payload: rawReply[i + 1]
        });
      }
      return transformedReply;
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/search/dist/commands/SUGGET_WITHSCORES_WITHPAYLOADS.js
var require_SUGGET_WITHSCORES_WITHPAYLOADS = __commonJS({
  "node_modules/@redis/search/dist/commands/SUGGET_WITHSCORES_WITHPAYLOADS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var SUGGET_1 = require_SUGGET();
    var SUGGET_2 = require_SUGGET();
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return SUGGET_2.IS_READ_ONLY;
    } });
    function transformArguments(key, prefix, options) {
      return [
        ...(0, SUGGET_1.transformArguments)(key, prefix, options),
        "WITHSCORES",
        "WITHPAYLOADS"
      ];
    }
    exports.transformArguments = transformArguments;
    function transformReply(rawReply) {
      if (rawReply === null)
        return null;
      const transformedReply = [];
      for (let i = 0; i < rawReply.length; i += 3) {
        transformedReply.push({
          suggestion: rawReply[i],
          score: Number(rawReply[i + 1]),
          payload: rawReply[i + 2]
        });
      }
      return transformedReply;
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/search/dist/commands/SUGGET_WITHSCORES.js
var require_SUGGET_WITHSCORES = __commonJS({
  "node_modules/@redis/search/dist/commands/SUGGET_WITHSCORES.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var SUGGET_1 = require_SUGGET();
    var SUGGET_2 = require_SUGGET();
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return SUGGET_2.IS_READ_ONLY;
    } });
    function transformArguments(key, prefix, options) {
      return [
        ...(0, SUGGET_1.transformArguments)(key, prefix, options),
        "WITHSCORES"
      ];
    }
    exports.transformArguments = transformArguments;
    function transformReply(rawReply) {
      if (rawReply === null)
        return null;
      const transformedReply = [];
      for (let i = 0; i < rawReply.length; i += 2) {
        transformedReply.push({
          suggestion: rawReply[i],
          score: Number(rawReply[i + 1])
        });
      }
      return transformedReply;
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/search/dist/commands/SUGLEN.js
var require_SUGLEN = __commonJS({
  "node_modules/@redis/search/dist/commands/SUGLEN.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["FT.SUGLEN", key];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/SYNDUMP.js
var require_SYNDUMP = __commonJS({
  "node_modules/@redis/search/dist/commands/SYNDUMP.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(index) {
      return ["FT.SYNDUMP", index];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/SYNUPDATE.js
var require_SYNUPDATE = __commonJS({
  "node_modules/@redis/search/dist/commands/SYNUPDATE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    var generic_transformers_1 = require_generic_transformers();
    function transformArguments(index, groupId, terms, options) {
      const args = ["FT.SYNUPDATE", index, groupId];
      if (options?.SKIPINITIALSCAN) {
        args.push("SKIPINITIALSCAN");
      }
      return (0, generic_transformers_1.pushVerdictArguments)(args, terms);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/TAGVALS.js
var require_TAGVALS = __commonJS({
  "node_modules/@redis/search/dist/commands/TAGVALS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = void 0;
    function transformArguments(index, fieldName) {
      return ["FT.TAGVALS", index, fieldName];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/search/dist/commands/index.js
var require_commands6 = __commonJS({
  "node_modules/@redis/search/dist/commands/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformProfile = exports.pushSearchOptions = exports.pushParamsArgs = exports.pushSchema = exports.VectorAlgorithms = exports.SchemaTextFieldPhonetics = exports.SchemaFieldTypes = exports.pushArgumentsWithLength = exports.pushSortByArguments = exports.pushSortByProperty = exports.RedisSearchLanguages = void 0;
    var _LIST = require_LIST3();
    var ALTER = require_ALTER();
    var AGGREGATE_WITHCURSOR = require_AGGREGATE_WITHCURSOR();
    var AGGREGATE = require_AGGREGATE();
    var ALIASADD = require_ALIASADD();
    var ALIASDEL = require_ALIASDEL();
    var ALIASUPDATE = require_ALIASUPDATE();
    var CONFIG_GET = require_CONFIG_GET3();
    var CONFIG_SET = require_CONFIG_SET3();
    var CREATE = require_CREATE2();
    var CURSOR_DEL = require_CURSOR_DEL();
    var CURSOR_READ = require_CURSOR_READ();
    var DICTADD = require_DICTADD();
    var DICTDEL = require_DICTDEL();
    var DICTDUMP = require_DICTDUMP();
    var DROPINDEX = require_DROPINDEX();
    var EXPLAIN = require_EXPLAIN2();
    var EXPLAINCLI = require_EXPLAINCLI();
    var INFO = require_INFO7();
    var PROFILESEARCH = require_PROFILE_SEARCH();
    var PROFILEAGGREGATE = require_PROFILE_AGGREGATE();
    var SEARCH = require_SEARCH();
    var SEARCH_NOCONTENT = require_SEARCH_NOCONTENT();
    var SPELLCHECK = require_SPELLCHECK();
    var SUGADD = require_SUGADD();
    var SUGDEL = require_SUGDEL();
    var SUGGET_WITHPAYLOADS = require_SUGGET_WITHPAYLOADS();
    var SUGGET_WITHSCORES_WITHPAYLOADS = require_SUGGET_WITHSCORES_WITHPAYLOADS();
    var SUGGET_WITHSCORES = require_SUGGET_WITHSCORES();
    var SUGGET = require_SUGGET();
    var SUGLEN = require_SUGLEN();
    var SYNDUMP = require_SYNDUMP();
    var SYNUPDATE = require_SYNUPDATE();
    var TAGVALS = require_TAGVALS();
    var generic_transformers_1 = require_generic_transformers();
    exports.default = {
      _LIST,
      _list: _LIST,
      ALTER,
      alter: ALTER,
      AGGREGATE_WITHCURSOR,
      aggregateWithCursor: AGGREGATE_WITHCURSOR,
      AGGREGATE,
      aggregate: AGGREGATE,
      ALIASADD,
      aliasAdd: ALIASADD,
      ALIASDEL,
      aliasDel: ALIASDEL,
      ALIASUPDATE,
      aliasUpdate: ALIASUPDATE,
      CONFIG_GET,
      configGet: CONFIG_GET,
      CONFIG_SET,
      configSet: CONFIG_SET,
      CREATE,
      create: CREATE,
      CURSOR_DEL,
      cursorDel: CURSOR_DEL,
      CURSOR_READ,
      cursorRead: CURSOR_READ,
      DICTADD,
      dictAdd: DICTADD,
      DICTDEL,
      dictDel: DICTDEL,
      DICTDUMP,
      dictDump: DICTDUMP,
      DROPINDEX,
      dropIndex: DROPINDEX,
      EXPLAIN,
      explain: EXPLAIN,
      EXPLAINCLI,
      explainCli: EXPLAINCLI,
      INFO,
      info: INFO,
      PROFILESEARCH,
      profileSearch: PROFILESEARCH,
      PROFILEAGGREGATE,
      profileAggregate: PROFILEAGGREGATE,
      SEARCH,
      search: SEARCH,
      SEARCH_NOCONTENT,
      searchNoContent: SEARCH_NOCONTENT,
      SPELLCHECK,
      spellCheck: SPELLCHECK,
      SUGADD,
      sugAdd: SUGADD,
      SUGDEL,
      sugDel: SUGDEL,
      SUGGET_WITHPAYLOADS,
      sugGetWithPayloads: SUGGET_WITHPAYLOADS,
      SUGGET_WITHSCORES_WITHPAYLOADS,
      sugGetWithScoresWithPayloads: SUGGET_WITHSCORES_WITHPAYLOADS,
      SUGGET_WITHSCORES,
      sugGetWithScores: SUGGET_WITHSCORES,
      SUGGET,
      sugGet: SUGGET,
      SUGLEN,
      sugLen: SUGLEN,
      SYNDUMP,
      synDump: SYNDUMP,
      SYNUPDATE,
      synUpdate: SYNUPDATE,
      TAGVALS,
      tagVals: TAGVALS
    };
    var RedisSearchLanguages;
    (function(RedisSearchLanguages2) {
      RedisSearchLanguages2["ARABIC"] = "Arabic";
      RedisSearchLanguages2["BASQUE"] = "Basque";
      RedisSearchLanguages2["CATALANA"] = "Catalan";
      RedisSearchLanguages2["DANISH"] = "Danish";
      RedisSearchLanguages2["DUTCH"] = "Dutch";
      RedisSearchLanguages2["ENGLISH"] = "English";
      RedisSearchLanguages2["FINNISH"] = "Finnish";
      RedisSearchLanguages2["FRENCH"] = "French";
      RedisSearchLanguages2["GERMAN"] = "German";
      RedisSearchLanguages2["GREEK"] = "Greek";
      RedisSearchLanguages2["HUNGARIAN"] = "Hungarian";
      RedisSearchLanguages2["INDONESAIN"] = "Indonesian";
      RedisSearchLanguages2["IRISH"] = "Irish";
      RedisSearchLanguages2["ITALIAN"] = "Italian";
      RedisSearchLanguages2["LITHUANIAN"] = "Lithuanian";
      RedisSearchLanguages2["NEPALI"] = "Nepali";
      RedisSearchLanguages2["NORWEIGAN"] = "Norwegian";
      RedisSearchLanguages2["PORTUGUESE"] = "Portuguese";
      RedisSearchLanguages2["ROMANIAN"] = "Romanian";
      RedisSearchLanguages2["RUSSIAN"] = "Russian";
      RedisSearchLanguages2["SPANISH"] = "Spanish";
      RedisSearchLanguages2["SWEDISH"] = "Swedish";
      RedisSearchLanguages2["TAMIL"] = "Tamil";
      RedisSearchLanguages2["TURKISH"] = "Turkish";
      RedisSearchLanguages2["CHINESE"] = "Chinese";
    })(RedisSearchLanguages || (exports.RedisSearchLanguages = RedisSearchLanguages = {}));
    function pushSortByProperty(args, sortBy) {
      if (typeof sortBy === "string") {
        args.push(sortBy);
      } else {
        args.push(sortBy.BY);
        if (sortBy.DIRECTION) {
          args.push(sortBy.DIRECTION);
        }
      }
    }
    exports.pushSortByProperty = pushSortByProperty;
    function pushSortByArguments(args, name, sortBy) {
      const lengthBefore = args.push(
        name,
        ""
        // will be overwritten
      );
      if (Array.isArray(sortBy)) {
        for (const field of sortBy) {
          pushSortByProperty(args, field);
        }
      } else {
        pushSortByProperty(args, sortBy);
      }
      args[lengthBefore - 1] = (args.length - lengthBefore).toString();
      return args;
    }
    exports.pushSortByArguments = pushSortByArguments;
    function pushArgumentsWithLength(args, fn) {
      const lengthIndex = args.push("") - 1;
      fn(args);
      args[lengthIndex] = (args.length - lengthIndex - 1).toString();
      return args;
    }
    exports.pushArgumentsWithLength = pushArgumentsWithLength;
    var SchemaFieldTypes;
    (function(SchemaFieldTypes2) {
      SchemaFieldTypes2["TEXT"] = "TEXT";
      SchemaFieldTypes2["NUMERIC"] = "NUMERIC";
      SchemaFieldTypes2["GEO"] = "GEO";
      SchemaFieldTypes2["TAG"] = "TAG";
      SchemaFieldTypes2["VECTOR"] = "VECTOR";
    })(SchemaFieldTypes || (exports.SchemaFieldTypes = SchemaFieldTypes = {}));
    var SchemaTextFieldPhonetics;
    (function(SchemaTextFieldPhonetics2) {
      SchemaTextFieldPhonetics2["DM_EN"] = "dm:en";
      SchemaTextFieldPhonetics2["DM_FR"] = "dm:fr";
      SchemaTextFieldPhonetics2["FM_PT"] = "dm:pt";
      SchemaTextFieldPhonetics2["DM_ES"] = "dm:es";
    })(SchemaTextFieldPhonetics || (exports.SchemaTextFieldPhonetics = SchemaTextFieldPhonetics = {}));
    var VectorAlgorithms;
    (function(VectorAlgorithms2) {
      VectorAlgorithms2["FLAT"] = "FLAT";
      VectorAlgorithms2["HNSW"] = "HNSW";
    })(VectorAlgorithms || (exports.VectorAlgorithms = VectorAlgorithms = {}));
    function pushSchema(args, schema) {
      for (const [field, fieldOptions] of Object.entries(schema)) {
        args.push(field);
        if (typeof fieldOptions === "string") {
          args.push(fieldOptions);
          continue;
        }
        if (fieldOptions.AS) {
          args.push("AS", fieldOptions.AS);
        }
        args.push(fieldOptions.type);
        switch (fieldOptions.type) {
          case SchemaFieldTypes.TEXT:
            if (fieldOptions.NOSTEM) {
              args.push("NOSTEM");
            }
            if (fieldOptions.WEIGHT) {
              args.push("WEIGHT", fieldOptions.WEIGHT.toString());
            }
            if (fieldOptions.PHONETIC) {
              args.push("PHONETIC", fieldOptions.PHONETIC);
            }
            if (fieldOptions.WITHSUFFIXTRIE) {
              args.push("WITHSUFFIXTRIE");
            }
            break;
          case SchemaFieldTypes.TAG:
            if (fieldOptions.SEPARATOR) {
              args.push("SEPARATOR", fieldOptions.SEPARATOR);
            }
            if (fieldOptions.CASESENSITIVE) {
              args.push("CASESENSITIVE");
            }
            if (fieldOptions.WITHSUFFIXTRIE) {
              args.push("WITHSUFFIXTRIE");
            }
            break;
          case SchemaFieldTypes.VECTOR:
            args.push(fieldOptions.ALGORITHM);
            pushArgumentsWithLength(args, () => {
              args.push("TYPE", fieldOptions.TYPE, "DIM", fieldOptions.DIM.toString(), "DISTANCE_METRIC", fieldOptions.DISTANCE_METRIC);
              if (fieldOptions.INITIAL_CAP) {
                args.push("INITIAL_CAP", fieldOptions.INITIAL_CAP.toString());
              }
              switch (fieldOptions.ALGORITHM) {
                case VectorAlgorithms.FLAT:
                  if (fieldOptions.BLOCK_SIZE) {
                    args.push("BLOCK_SIZE", fieldOptions.BLOCK_SIZE.toString());
                  }
                  break;
                case VectorAlgorithms.HNSW:
                  if (fieldOptions.M) {
                    args.push("M", fieldOptions.M.toString());
                  }
                  if (fieldOptions.EF_CONSTRUCTION) {
                    args.push("EF_CONSTRUCTION", fieldOptions.EF_CONSTRUCTION.toString());
                  }
                  if (fieldOptions.EF_RUNTIME) {
                    args.push("EF_RUNTIME", fieldOptions.EF_RUNTIME.toString());
                  }
                  break;
              }
            });
            continue;
        }
        if (fieldOptions.SORTABLE) {
          args.push("SORTABLE");
          if (fieldOptions.SORTABLE === "UNF") {
            args.push("UNF");
          }
        }
        if (fieldOptions.NOINDEX) {
          args.push("NOINDEX");
        }
      }
    }
    exports.pushSchema = pushSchema;
    function pushParamsArgs(args, params) {
      if (params) {
        const enrties = Object.entries(params);
        args.push("PARAMS", (enrties.length * 2).toString());
        for (const [key, value] of enrties) {
          args.push(key, typeof value === "number" ? value.toString() : value);
        }
      }
      return args;
    }
    exports.pushParamsArgs = pushParamsArgs;
    function pushSearchOptions(args, options) {
      if (options?.VERBATIM) {
        args.push("VERBATIM");
      }
      if (options?.NOSTOPWORDS) {
        args.push("NOSTOPWORDS");
      }
      (0, generic_transformers_1.pushOptionalVerdictArgument)(args, "INKEYS", options?.INKEYS);
      (0, generic_transformers_1.pushOptionalVerdictArgument)(args, "INFIELDS", options?.INFIELDS);
      (0, generic_transformers_1.pushOptionalVerdictArgument)(args, "RETURN", options?.RETURN);
      if (options?.SUMMARIZE) {
        args.push("SUMMARIZE");
        if (typeof options.SUMMARIZE === "object") {
          if (options.SUMMARIZE.FIELDS) {
            args.push("FIELDS");
            (0, generic_transformers_1.pushVerdictArgument)(args, options.SUMMARIZE.FIELDS);
          }
          if (options.SUMMARIZE.FRAGS) {
            args.push("FRAGS", options.SUMMARIZE.FRAGS.toString());
          }
          if (options.SUMMARIZE.LEN) {
            args.push("LEN", options.SUMMARIZE.LEN.toString());
          }
          if (options.SUMMARIZE.SEPARATOR) {
            args.push("SEPARATOR", options.SUMMARIZE.SEPARATOR);
          }
        }
      }
      if (options?.HIGHLIGHT) {
        args.push("HIGHLIGHT");
        if (typeof options.HIGHLIGHT === "object") {
          if (options.HIGHLIGHT.FIELDS) {
            args.push("FIELDS");
            (0, generic_transformers_1.pushVerdictArgument)(args, options.HIGHLIGHT.FIELDS);
          }
          if (options.HIGHLIGHT.TAGS) {
            args.push("TAGS", options.HIGHLIGHT.TAGS.open, options.HIGHLIGHT.TAGS.close);
          }
        }
      }
      if (options?.SLOP) {
        args.push("SLOP", options.SLOP.toString());
      }
      if (options?.INORDER) {
        args.push("INORDER");
      }
      if (options?.LANGUAGE) {
        args.push("LANGUAGE", options.LANGUAGE);
      }
      if (options?.EXPANDER) {
        args.push("EXPANDER", options.EXPANDER);
      }
      if (options?.SCORER) {
        args.push("SCORER", options.SCORER);
      }
      if (options?.SORTBY) {
        args.push("SORTBY");
        pushSortByProperty(args, options.SORTBY);
      }
      if (options?.LIMIT) {
        args.push("LIMIT", options.LIMIT.from.toString(), options.LIMIT.size.toString());
      }
      if (options?.PARAMS) {
        pushParamsArgs(args, options.PARAMS);
      }
      if (options?.DIALECT) {
        args.push("DIALECT", options.DIALECT.toString());
      }
      if (options?.RETURN?.length === 0) {
        args.preserve = true;
      }
      if (options?.TIMEOUT !== void 0) {
        args.push("TIMEOUT", options.TIMEOUT.toString());
      }
      return args;
    }
    exports.pushSearchOptions = pushSearchOptions;
    function transformProfile(reply) {
      return {
        totalProfileTime: reply[0][1],
        parsingTime: reply[1][1],
        pipelineCreationTime: reply[2][1],
        iteratorsProfile: transformIterators(reply[3][1])
      };
    }
    exports.transformProfile = transformProfile;
    function transformIterators(IteratorsProfile) {
      var res = {};
      for (let i = 0; i < IteratorsProfile.length; i += 2) {
        const value = IteratorsProfile[i + 1];
        switch (IteratorsProfile[i]) {
          case "Type":
            res.type = value;
            break;
          case "Counter":
            res.counter = value;
            break;
          case "Time":
            res.time = value;
            break;
          case "Query type":
            res.queryType = value;
            break;
          case "Child iterators":
            res.childIterators = value.map(transformChildIterators);
            break;
        }
      }
      return res;
    }
    function transformChildIterators(IteratorsProfile) {
      var res = {};
      for (let i = 1; i < IteratorsProfile.length; i += 2) {
        const value = IteratorsProfile[i + 1];
        switch (IteratorsProfile[i]) {
          case "Type":
            res.type = value;
            break;
          case "Counter":
            res.counter = value;
            break;
          case "Time":
            res.time = value;
            break;
          case "Size":
            res.size = value;
            break;
          case "Term":
            res.term = value;
            break;
          case "Child iterators":
            res.childIterators = value.map(transformChildIterators);
            break;
        }
      }
      return res;
    }
  }
});

// node_modules/@redis/search/dist/index.js
var require_dist6 = __commonJS({
  "node_modules/@redis/search/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AggregateGroupByReducers = exports.AggregateSteps = exports.VectorAlgorithms = exports.SchemaTextFieldPhonetics = exports.SchemaFieldTypes = exports.default = void 0;
    var commands_1 = require_commands6();
    Object.defineProperty(exports, "default", { enumerable: true, get: function() {
      return commands_1.default;
    } });
    var commands_2 = require_commands6();
    Object.defineProperty(exports, "SchemaFieldTypes", { enumerable: true, get: function() {
      return commands_2.SchemaFieldTypes;
    } });
    Object.defineProperty(exports, "SchemaTextFieldPhonetics", { enumerable: true, get: function() {
      return commands_2.SchemaTextFieldPhonetics;
    } });
    Object.defineProperty(exports, "VectorAlgorithms", { enumerable: true, get: function() {
      return commands_2.VectorAlgorithms;
    } });
    var AGGREGATE_1 = require_AGGREGATE();
    Object.defineProperty(exports, "AggregateSteps", { enumerable: true, get: function() {
      return AGGREGATE_1.AggregateSteps;
    } });
    Object.defineProperty(exports, "AggregateGroupByReducers", { enumerable: true, get: function() {
      return AGGREGATE_1.AggregateGroupByReducers;
    } });
  }
});

// node_modules/@redis/time-series/dist/commands/ADD.js
var require_ADD5 = __commonJS({
  "node_modules/@redis/time-series/dist/commands/ADD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands7();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, timestamp, value, options) {
      const args = [
        "TS.ADD",
        key,
        (0, _1.transformTimestampArgument)(timestamp),
        value.toString()
      ];
      (0, _1.pushRetentionArgument)(args, options?.RETENTION);
      (0, _1.pushEncodingArgument)(args, options?.ENCODING);
      (0, _1.pushChunkSizeArgument)(args, options?.CHUNK_SIZE);
      if (options?.ON_DUPLICATE) {
        args.push("ON_DUPLICATE", options.ON_DUPLICATE);
      }
      (0, _1.pushLabelsArgument)(args, options?.LABELS);
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/time-series/dist/commands/ALTER.js
var require_ALTER2 = __commonJS({
  "node_modules/@redis/time-series/dist/commands/ALTER.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands7();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, options) {
      const args = ["TS.ALTER", key];
      (0, _1.pushRetentionArgument)(args, options?.RETENTION);
      (0, _1.pushChunkSizeArgument)(args, options?.CHUNK_SIZE);
      (0, _1.pushDuplicatePolicy)(args, options?.DUPLICATE_POLICY);
      (0, _1.pushLabelsArgument)(args, options?.LABELS);
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/time-series/dist/commands/CREATE.js
var require_CREATE3 = __commonJS({
  "node_modules/@redis/time-series/dist/commands/CREATE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands7();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, options) {
      const args = ["TS.CREATE", key];
      (0, _1.pushRetentionArgument)(args, options?.RETENTION);
      (0, _1.pushEncodingArgument)(args, options?.ENCODING);
      (0, _1.pushChunkSizeArgument)(args, options?.CHUNK_SIZE);
      (0, _1.pushDuplicatePolicy)(args, options?.DUPLICATE_POLICY);
      (0, _1.pushLabelsArgument)(args, options?.LABELS);
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/time-series/dist/commands/CREATERULE.js
var require_CREATERULE = __commonJS({
  "node_modules/@redis/time-series/dist/commands/CREATERULE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(sourceKey, destinationKey, aggregationType, bucketDuration, alignTimestamp) {
      const args = [
        "TS.CREATERULE",
        sourceKey,
        destinationKey,
        "AGGREGATION",
        aggregationType,
        bucketDuration.toString()
      ];
      if (alignTimestamp) {
        args.push(alignTimestamp.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/time-series/dist/commands/DECRBY.js
var require_DECRBY2 = __commonJS({
  "node_modules/@redis/time-series/dist/commands/DECRBY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands7();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, value, options) {
      return (0, _1.transformIncrDecrArguments)("TS.DECRBY", key, value, options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/time-series/dist/commands/DEL.js
var require_DEL4 = __commonJS({
  "node_modules/@redis/time-series/dist/commands/DEL.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRTS_KEY_INDEX = void 0;
    var _1 = require_commands7();
    exports.FIRTS_KEY_INDEX = 1;
    function transformArguments(key, fromTimestamp, toTimestamp) {
      return [
        "TS.DEL",
        key,
        (0, _1.transformTimestampArgument)(fromTimestamp),
        (0, _1.transformTimestampArgument)(toTimestamp)
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/time-series/dist/commands/DELETERULE.js
var require_DELETERULE = __commonJS({
  "node_modules/@redis/time-series/dist/commands/DELETERULE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(sourceKey, destinationKey) {
      return [
        "TS.DELETERULE",
        sourceKey,
        destinationKey
      ];
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/time-series/dist/commands/GET.js
var require_GET3 = __commonJS({
  "node_modules/@redis/time-series/dist/commands/GET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands7();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, options) {
      return (0, _1.pushLatestArgument)(["TS.GET", key], options?.LATEST);
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      if (reply.length === 0)
        return null;
      return (0, _1.transformSampleReply)(reply);
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/time-series/dist/commands/INCRBY.js
var require_INCRBY4 = __commonJS({
  "node_modules/@redis/time-series/dist/commands/INCRBY.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands7();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(key, value, options) {
      return (0, _1.transformIncrDecrArguments)("TS.INCRBY", key, value, options);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/time-series/dist/commands/INFO.js
var require_INFO8 = __commonJS({
  "node_modules/@redis/time-series/dist/commands/INFO.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key) {
      return ["TS.INFO", key];
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return {
        totalSamples: reply[1],
        memoryUsage: reply[3],
        firstTimestamp: reply[5],
        lastTimestamp: reply[7],
        retentionTime: reply[9],
        chunkCount: reply[11],
        chunkSize: reply[13],
        chunkType: reply[15],
        duplicatePolicy: reply[17],
        labels: reply[19].map(([name, value]) => ({
          name,
          value
        })),
        sourceKey: reply[21],
        rules: reply[23].map(([key, timeBucket, aggregationType]) => ({
          key,
          timeBucket,
          aggregationType
        }))
      };
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/time-series/dist/commands/INFO_DEBUG.js
var require_INFO_DEBUG = __commonJS({
  "node_modules/@redis/time-series/dist/commands/INFO_DEBUG.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = exports.IS_READ_ONLY = void 0;
    var INFO_1 = require_INFO8();
    var INFO_2 = require_INFO8();
    Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function() {
      return INFO_2.IS_READ_ONLY;
    } });
    Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function() {
      return INFO_2.FIRST_KEY_INDEX;
    } });
    function transformArguments(key) {
      const args = (0, INFO_1.transformArguments)(key);
      args.push("DEBUG");
      return args;
    }
    exports.transformArguments = transformArguments;
    function transformReply(rawReply) {
      const reply = (0, INFO_1.transformReply)(rawReply);
      reply.keySelfName = rawReply[25];
      reply.chunks = rawReply[27].map((chunk) => ({
        startTimestamp: chunk[1],
        endTimestamp: chunk[3],
        samples: chunk[5],
        size: chunk[7],
        bytesPerSample: chunk[9]
      }));
      return reply;
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/time-series/dist/commands/MADD.js
var require_MADD2 = __commonJS({
  "node_modules/@redis/time-series/dist/commands/MADD.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands7();
    exports.FIRST_KEY_INDEX = 1;
    function transformArguments(toAdd) {
      const args = ["TS.MADD"];
      for (const { key, timestamp, value } of toAdd) {
        args.push(key, (0, _1.transformTimestampArgument)(timestamp), value.toString());
      }
      return args;
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/time-series/dist/commands/MGET.js
var require_MGET3 = __commonJS({
  "node_modules/@redis/time-series/dist/commands/MGET.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var _1 = require_commands7();
    exports.IS_READ_ONLY = true;
    function transformArguments(filter, options) {
      const args = (0, _1.pushLatestArgument)(["TS.MGET"], options?.LATEST);
      return (0, _1.pushFilterArgument)(args, filter);
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return reply.map(([key, _, sample]) => ({
        key,
        sample: (0, _1.transformSampleReply)(sample)
      }));
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/time-series/dist/commands/MGET_WITHLABELS.js
var require_MGET_WITHLABELS = __commonJS({
  "node_modules/@redis/time-series/dist/commands/MGET_WITHLABELS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var _1 = require_commands7();
    exports.IS_READ_ONLY = true;
    function transformArguments(filter, options) {
      const args = (0, _1.pushWithLabelsArgument)(["TS.MGET"], options?.SELECTED_LABELS);
      return (0, _1.pushFilterArgument)(args, filter);
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return reply.map(([key, labels, sample]) => ({
        key,
        labels: (0, _1.transformLablesReply)(labels),
        sample: (0, _1.transformSampleReply)(sample)
      }));
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/time-series/dist/commands/QUERYINDEX.js
var require_QUERYINDEX = __commonJS({
  "node_modules/@redis/time-series/dist/commands/QUERYINDEX.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var generic_transformers_1 = require_generic_transformers();
    exports.IS_READ_ONLY = true;
    function transformArguments(filter) {
      return (0, generic_transformers_1.pushVerdictArguments)(["TS.QUERYINDEX"], filter);
    }
    exports.transformArguments = transformArguments;
  }
});

// node_modules/@redis/time-series/dist/commands/RANGE.js
var require_RANGE = __commonJS({
  "node_modules/@redis/time-series/dist/commands/RANGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands7();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, fromTimestamp, toTimestamp, options) {
      return (0, _1.pushRangeArguments)(["TS.RANGE", key], fromTimestamp, toTimestamp, options);
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return (0, _1.transformRangeReply)(reply);
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/time-series/dist/commands/REVRANGE.js
var require_REVRANGE = __commonJS({
  "node_modules/@redis/time-series/dist/commands/REVRANGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
    var _1 = require_commands7();
    exports.FIRST_KEY_INDEX = 1;
    exports.IS_READ_ONLY = true;
    function transformArguments(key, fromTimestamp, toTimestamp, options) {
      return (0, _1.pushRangeArguments)(["TS.REVRANGE", key], fromTimestamp, toTimestamp, options);
    }
    exports.transformArguments = transformArguments;
    function transformReply(reply) {
      return (0, _1.transformRangeReply)(reply);
    }
    exports.transformReply = transformReply;
  }
});

// node_modules/@redis/time-series/dist/commands/MRANGE.js
var require_MRANGE = __commonJS({
  "node_modules/@redis/time-series/dist/commands/MRANGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var _1 = require_commands7();
    exports.IS_READ_ONLY = true;
    function transformArguments(fromTimestamp, toTimestamp, filters, options) {
      return (0, _1.pushMRangeArguments)(["TS.MRANGE"], fromTimestamp, toTimestamp, filters, options);
    }
    exports.transformArguments = transformArguments;
    var _2 = require_commands7();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return _2.transformMRangeReply;
    } });
  }
});

// node_modules/@redis/time-series/dist/commands/MRANGE_WITHLABELS.js
var require_MRANGE_WITHLABELS = __commonJS({
  "node_modules/@redis/time-series/dist/commands/MRANGE_WITHLABELS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var _1 = require_commands7();
    exports.IS_READ_ONLY = true;
    function transformArguments(fromTimestamp, toTimestamp, filters, options) {
      return (0, _1.pushMRangeWithLabelsArguments)(["TS.MRANGE"], fromTimestamp, toTimestamp, filters, options);
    }
    exports.transformArguments = transformArguments;
    var _2 = require_commands7();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return _2.transformMRangeWithLabelsReply;
    } });
  }
});

// node_modules/@redis/time-series/dist/commands/MREVRANGE.js
var require_MREVRANGE = __commonJS({
  "node_modules/@redis/time-series/dist/commands/MREVRANGE.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var _1 = require_commands7();
    exports.IS_READ_ONLY = true;
    function transformArguments(fromTimestamp, toTimestamp, filters, options) {
      return (0, _1.pushMRangeArguments)(["TS.MREVRANGE"], fromTimestamp, toTimestamp, filters, options);
    }
    exports.transformArguments = transformArguments;
    var _2 = require_commands7();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return _2.transformMRangeReply;
    } });
  }
});

// node_modules/@redis/time-series/dist/commands/MREVRANGE_WITHLABELS.js
var require_MREVRANGE_WITHLABELS = __commonJS({
  "node_modules/@redis/time-series/dist/commands/MREVRANGE_WITHLABELS.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
    var _1 = require_commands7();
    exports.IS_READ_ONLY = true;
    function transformArguments(fromTimestamp, toTimestamp, filters, options) {
      return (0, _1.pushMRangeWithLabelsArguments)(["TS.MREVRANGE"], fromTimestamp, toTimestamp, filters, options);
    }
    exports.transformArguments = transformArguments;
    var _2 = require_commands7();
    Object.defineProperty(exports, "transformReply", { enumerable: true, get: function() {
      return _2.transformMRangeWithLabelsReply;
    } });
  }
});

// node_modules/@redis/time-series/dist/commands/index.js
var require_commands7 = __commonJS({
  "node_modules/@redis/time-series/dist/commands/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.pushLatestArgument = exports.transformMRangeWithLabelsReply = exports.transformMRangeReply = exports.transformRangeReply = exports.pushMRangeWithLabelsArguments = exports.pushWithLabelsArgument = exports.pushMRangeArguments = exports.pushFilterArgument = exports.pushMRangeGroupByArguments = exports.pushRangeArguments = exports.TimeSeriesBucketTimestamp = exports.transformSampleReply = exports.transformIncrDecrArguments = exports.pushLabelsArgument = exports.transformLablesReply = exports.pushDuplicatePolicy = exports.pushChunkSizeArgument = exports.pushEncodingArgument = exports.TimeSeriesEncoding = exports.pushRetentionArgument = exports.transformTimestampArgument = exports.TimeSeriesReducers = exports.TimeSeriesDuplicatePolicies = exports.TimeSeriesAggregationType = void 0;
    var ADD = require_ADD5();
    var ALTER = require_ALTER2();
    var CREATE = require_CREATE3();
    var CREATERULE = require_CREATERULE();
    var DECRBY = require_DECRBY2();
    var DEL = require_DEL4();
    var DELETERULE = require_DELETERULE();
    var GET = require_GET3();
    var INCRBY = require_INCRBY4();
    var INFO_DEBUG = require_INFO_DEBUG();
    var INFO = require_INFO8();
    var MADD = require_MADD2();
    var MGET = require_MGET3();
    var MGET_WITHLABELS = require_MGET_WITHLABELS();
    var QUERYINDEX = require_QUERYINDEX();
    var RANGE = require_RANGE();
    var REVRANGE = require_REVRANGE();
    var MRANGE = require_MRANGE();
    var MRANGE_WITHLABELS = require_MRANGE_WITHLABELS();
    var MREVRANGE = require_MREVRANGE();
    var MREVRANGE_WITHLABELS = require_MREVRANGE_WITHLABELS();
    var generic_transformers_1 = require_generic_transformers();
    exports.default = {
      ADD,
      add: ADD,
      ALTER,
      alter: ALTER,
      CREATE,
      create: CREATE,
      CREATERULE,
      createRule: CREATERULE,
      DECRBY,
      decrBy: DECRBY,
      DEL,
      del: DEL,
      DELETERULE,
      deleteRule: DELETERULE,
      GET,
      get: GET,
      INCRBY,
      incrBy: INCRBY,
      INFO_DEBUG,
      infoDebug: INFO_DEBUG,
      INFO,
      info: INFO,
      MADD,
      mAdd: MADD,
      MGET,
      mGet: MGET,
      MGET_WITHLABELS,
      mGetWithLabels: MGET_WITHLABELS,
      QUERYINDEX,
      queryIndex: QUERYINDEX,
      RANGE,
      range: RANGE,
      REVRANGE,
      revRange: REVRANGE,
      MRANGE,
      mRange: MRANGE,
      MRANGE_WITHLABELS,
      mRangeWithLabels: MRANGE_WITHLABELS,
      MREVRANGE,
      mRevRange: MREVRANGE,
      MREVRANGE_WITHLABELS,
      mRevRangeWithLabels: MREVRANGE_WITHLABELS
    };
    var TimeSeriesAggregationType;
    (function(TimeSeriesAggregationType2) {
      TimeSeriesAggregationType2["AVG"] = "AVG";
      TimeSeriesAggregationType2["AVERAGE"] = "AVG";
      TimeSeriesAggregationType2["FIRST"] = "FIRST";
      TimeSeriesAggregationType2["LAST"] = "LAST";
      TimeSeriesAggregationType2["MIN"] = "MIN";
      TimeSeriesAggregationType2["MINIMUM"] = "MIN";
      TimeSeriesAggregationType2["MAX"] = "MAX";
      TimeSeriesAggregationType2["MAXIMUM"] = "MAX";
      TimeSeriesAggregationType2["SUM"] = "SUM";
      TimeSeriesAggregationType2["RANGE"] = "RANGE";
      TimeSeriesAggregationType2["COUNT"] = "COUNT";
      TimeSeriesAggregationType2["STD_P"] = "STD.P";
      TimeSeriesAggregationType2["STD_S"] = "STD.S";
      TimeSeriesAggregationType2["VAR_P"] = "VAR.P";
      TimeSeriesAggregationType2["VAR_S"] = "VAR.S";
      TimeSeriesAggregationType2["TWA"] = "TWA";
    })(TimeSeriesAggregationType || (exports.TimeSeriesAggregationType = TimeSeriesAggregationType = {}));
    var TimeSeriesDuplicatePolicies;
    (function(TimeSeriesDuplicatePolicies2) {
      TimeSeriesDuplicatePolicies2["BLOCK"] = "BLOCK";
      TimeSeriesDuplicatePolicies2["FIRST"] = "FIRST";
      TimeSeriesDuplicatePolicies2["LAST"] = "LAST";
      TimeSeriesDuplicatePolicies2["MIN"] = "MIN";
      TimeSeriesDuplicatePolicies2["MAX"] = "MAX";
      TimeSeriesDuplicatePolicies2["SUM"] = "SUM";
    })(TimeSeriesDuplicatePolicies || (exports.TimeSeriesDuplicatePolicies = TimeSeriesDuplicatePolicies = {}));
    var TimeSeriesReducers;
    (function(TimeSeriesReducers2) {
      TimeSeriesReducers2["AVG"] = "AVG";
      TimeSeriesReducers2["SUM"] = "SUM";
      TimeSeriesReducers2["MIN"] = "MIN";
      TimeSeriesReducers2["MINIMUM"] = "MIN";
      TimeSeriesReducers2["MAX"] = "MAX";
      TimeSeriesReducers2["MAXIMUM"] = "MAX";
      TimeSeriesReducers2["RANGE"] = "range";
      TimeSeriesReducers2["COUNT"] = "COUNT";
      TimeSeriesReducers2["STD_P"] = "STD.P";
      TimeSeriesReducers2["STD_S"] = "STD.S";
      TimeSeriesReducers2["VAR_P"] = "VAR.P";
      TimeSeriesReducers2["VAR_S"] = "VAR.S";
    })(TimeSeriesReducers || (exports.TimeSeriesReducers = TimeSeriesReducers = {}));
    function transformTimestampArgument(timestamp) {
      if (typeof timestamp === "string")
        return timestamp;
      return (typeof timestamp === "number" ? timestamp : timestamp.getTime()).toString();
    }
    exports.transformTimestampArgument = transformTimestampArgument;
    function pushRetentionArgument(args, retention) {
      if (retention !== void 0) {
        args.push("RETENTION", retention.toString());
      }
      return args;
    }
    exports.pushRetentionArgument = pushRetentionArgument;
    var TimeSeriesEncoding;
    (function(TimeSeriesEncoding2) {
      TimeSeriesEncoding2["COMPRESSED"] = "COMPRESSED";
      TimeSeriesEncoding2["UNCOMPRESSED"] = "UNCOMPRESSED";
    })(TimeSeriesEncoding || (exports.TimeSeriesEncoding = TimeSeriesEncoding = {}));
    function pushEncodingArgument(args, encoding) {
      if (encoding !== void 0) {
        args.push("ENCODING", encoding);
      }
      return args;
    }
    exports.pushEncodingArgument = pushEncodingArgument;
    function pushChunkSizeArgument(args, chunkSize) {
      if (chunkSize !== void 0) {
        args.push("CHUNK_SIZE", chunkSize.toString());
      }
      return args;
    }
    exports.pushChunkSizeArgument = pushChunkSizeArgument;
    function pushDuplicatePolicy(args, duplicatePolicy) {
      if (duplicatePolicy !== void 0) {
        args.push("DUPLICATE_POLICY", duplicatePolicy);
      }
      return args;
    }
    exports.pushDuplicatePolicy = pushDuplicatePolicy;
    function transformLablesReply(reply) {
      const labels = {};
      for (const [key, value] of reply) {
        labels[key] = value;
      }
      return labels;
    }
    exports.transformLablesReply = transformLablesReply;
    function pushLabelsArgument(args, labels) {
      if (labels) {
        args.push("LABELS");
        for (const [label, value] of Object.entries(labels)) {
          args.push(label, value);
        }
      }
      return args;
    }
    exports.pushLabelsArgument = pushLabelsArgument;
    function transformIncrDecrArguments(command, key, value, options) {
      const args = [
        command,
        key,
        value.toString()
      ];
      if (options?.TIMESTAMP !== void 0 && options?.TIMESTAMP !== null) {
        args.push("TIMESTAMP", transformTimestampArgument(options.TIMESTAMP));
      }
      pushRetentionArgument(args, options?.RETENTION);
      if (options?.UNCOMPRESSED) {
        args.push("UNCOMPRESSED");
      }
      pushChunkSizeArgument(args, options?.CHUNK_SIZE);
      pushLabelsArgument(args, options?.LABELS);
      return args;
    }
    exports.transformIncrDecrArguments = transformIncrDecrArguments;
    function transformSampleReply(reply) {
      return {
        timestamp: reply[0],
        value: Number(reply[1])
      };
    }
    exports.transformSampleReply = transformSampleReply;
    var TimeSeriesBucketTimestamp;
    (function(TimeSeriesBucketTimestamp2) {
      TimeSeriesBucketTimestamp2["LOW"] = "-";
      TimeSeriesBucketTimestamp2["HIGH"] = "+";
      TimeSeriesBucketTimestamp2["MID"] = "~";
    })(TimeSeriesBucketTimestamp || (exports.TimeSeriesBucketTimestamp = TimeSeriesBucketTimestamp = {}));
    function pushRangeArguments(args, fromTimestamp, toTimestamp, options) {
      args.push(transformTimestampArgument(fromTimestamp), transformTimestampArgument(toTimestamp));
      pushLatestArgument(args, options?.LATEST);
      if (options?.FILTER_BY_TS) {
        args.push("FILTER_BY_TS");
        for (const ts of options.FILTER_BY_TS) {
          args.push(transformTimestampArgument(ts));
        }
      }
      if (options?.FILTER_BY_VALUE) {
        args.push("FILTER_BY_VALUE", options.FILTER_BY_VALUE.min.toString(), options.FILTER_BY_VALUE.max.toString());
      }
      if (options?.COUNT) {
        args.push("COUNT", options.COUNT.toString());
      }
      if (options?.ALIGN) {
        args.push("ALIGN", transformTimestampArgument(options.ALIGN));
      }
      if (options?.AGGREGATION) {
        args.push("AGGREGATION", options.AGGREGATION.type, transformTimestampArgument(options.AGGREGATION.timeBucket));
        if (options.AGGREGATION.BUCKETTIMESTAMP) {
          args.push("BUCKETTIMESTAMP", options.AGGREGATION.BUCKETTIMESTAMP);
        }
        if (options.AGGREGATION.EMPTY) {
          args.push("EMPTY");
        }
      }
      return args;
    }
    exports.pushRangeArguments = pushRangeArguments;
    function pushMRangeGroupByArguments(args, groupBy) {
      if (groupBy) {
        args.push("GROUPBY", groupBy.label, "REDUCE", groupBy.reducer);
      }
      return args;
    }
    exports.pushMRangeGroupByArguments = pushMRangeGroupByArguments;
    function pushFilterArgument(args, filter) {
      args.push("FILTER");
      return (0, generic_transformers_1.pushVerdictArguments)(args, filter);
    }
    exports.pushFilterArgument = pushFilterArgument;
    function pushMRangeArguments(args, fromTimestamp, toTimestamp, filter, options) {
      args = pushRangeArguments(args, fromTimestamp, toTimestamp, options);
      args = pushFilterArgument(args, filter);
      return pushMRangeGroupByArguments(args, options?.GROUPBY);
    }
    exports.pushMRangeArguments = pushMRangeArguments;
    function pushWithLabelsArgument(args, selectedLabels) {
      if (!selectedLabels) {
        args.push("WITHLABELS");
      } else {
        args.push("SELECTED_LABELS");
        args = (0, generic_transformers_1.pushVerdictArguments)(args, selectedLabels);
      }
      return args;
    }
    exports.pushWithLabelsArgument = pushWithLabelsArgument;
    function pushMRangeWithLabelsArguments(args, fromTimestamp, toTimestamp, filter, options) {
      args = pushRangeArguments(args, fromTimestamp, toTimestamp, options);
      args = pushWithLabelsArgument(args, options?.SELECTED_LABELS);
      args = pushFilterArgument(args, filter);
      return pushMRangeGroupByArguments(args, options?.GROUPBY);
    }
    exports.pushMRangeWithLabelsArguments = pushMRangeWithLabelsArguments;
    function transformRangeReply(reply) {
      return reply.map(transformSampleReply);
    }
    exports.transformRangeReply = transformRangeReply;
    function transformMRangeReply(reply) {
      const args = [];
      for (const [key, _, sample] of reply) {
        args.push({
          key,
          samples: sample.map(transformSampleReply)
        });
      }
      return args;
    }
    exports.transformMRangeReply = transformMRangeReply;
    function transformMRangeWithLabelsReply(reply) {
      const args = [];
      for (const [key, labels, samples] of reply) {
        args.push({
          key,
          labels: transformLablesReply(labels),
          samples: samples.map(transformSampleReply)
        });
      }
      return args;
    }
    exports.transformMRangeWithLabelsReply = transformMRangeWithLabelsReply;
    function pushLatestArgument(args, latest) {
      if (latest) {
        args.push("LATEST");
      }
      return args;
    }
    exports.pushLatestArgument = pushLatestArgument;
  }
});

// node_modules/@redis/time-series/dist/index.js
var require_dist7 = __commonJS({
  "node_modules/@redis/time-series/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TimeSeriesBucketTimestamp = exports.TimeSeriesReducers = exports.TimeSeriesAggregationType = exports.TimeSeriesEncoding = exports.TimeSeriesDuplicatePolicies = exports.default = void 0;
    var commands_1 = require_commands7();
    Object.defineProperty(exports, "default", { enumerable: true, get: function() {
      return commands_1.default;
    } });
    var commands_2 = require_commands7();
    Object.defineProperty(exports, "TimeSeriesDuplicatePolicies", { enumerable: true, get: function() {
      return commands_2.TimeSeriesDuplicatePolicies;
    } });
    Object.defineProperty(exports, "TimeSeriesEncoding", { enumerable: true, get: function() {
      return commands_2.TimeSeriesEncoding;
    } });
    Object.defineProperty(exports, "TimeSeriesAggregationType", { enumerable: true, get: function() {
      return commands_2.TimeSeriesAggregationType;
    } });
    Object.defineProperty(exports, "TimeSeriesReducers", { enumerable: true, get: function() {
      return commands_2.TimeSeriesReducers;
    } });
    Object.defineProperty(exports, "TimeSeriesBucketTimestamp", { enumerable: true, get: function() {
      return commands_2.TimeSeriesBucketTimestamp;
    } });
  }
});

// node_modules/redis/dist/index.js
var require_dist8 = __commonJS({
  "node_modules/redis/dist/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p))
          __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createCluster = exports.createClient = void 0;
    var client_1 = require_dist2();
    var bloom_1 = require_dist3();
    var graph_1 = require_dist4();
    var json_1 = require_dist5();
    var search_1 = require_dist6();
    var time_series_1 = require_dist7();
    __exportStar(require_dist2(), exports);
    __exportStar(require_dist3(), exports);
    __exportStar(require_dist4(), exports);
    __exportStar(require_dist5(), exports);
    __exportStar(require_dist6(), exports);
    __exportStar(require_dist7(), exports);
    var modules = {
      ...bloom_1.default,
      graph: graph_1.default,
      json: json_1.default,
      ft: search_1.default,
      ts: time_series_1.default
    };
    function createClient2(options) {
      return (0, client_1.createClient)({
        ...options,
        modules: {
          ...modules,
          ...options?.modules
        }
      });
    }
    exports.createClient = createClient2;
    function createCluster(options) {
      return (0, client_1.createCluster)({
        ...options,
        modules: {
          ...modules,
          ...options?.modules
        }
      });
    }
    exports.createCluster = createCluster;
  }
});

// src/functions/recover/handler.ts
var handler_exports = {};
__export(handler_exports, {
  main: () => main
});
module.exports = __toCommonJS(handler_exports);

// src/libs/api-gateway.ts
var formatJSONResponse = (response) => {
  return {
    statusCode: 200,
    body: JSON.stringify(response)
  };
};
var jsonError = (message, code = 400) => {
  return {
    statusCode: code,
    body: JSON.stringify(message)
  };
};

// node_modules/@middy/core/index.js
var import_node_stream = require("node:stream");
var import_promises = require("node:stream/promises");
var import_promises2 = require("node:timers/promises");
var defaultLambdaHandler = () => {
};
var defaultPlugin = {
  timeoutEarlyInMillis: 5,
  timeoutEarlyResponse: () => {
    throw new Error("Timeout");
  },
  streamifyResponse: false
  // Deprecate need for this when AWS provides a flag for when it's looking for it
};
var middy = (lambdaHandler = defaultLambdaHandler, plugin = {}) => {
  if (typeof lambdaHandler !== "function") {
    plugin = lambdaHandler;
    lambdaHandler = defaultLambdaHandler;
  }
  plugin = {
    ...defaultPlugin,
    ...plugin
  };
  plugin.timeoutEarly = plugin.timeoutEarlyInMillis > 0;
  plugin.beforePrefetch?.();
  const beforeMiddlewares = [];
  const afterMiddlewares = [];
  const onErrorMiddlewares = [];
  const middyHandler = (event = {}, context = {}) => {
    plugin.requestStart?.();
    const request = {
      event,
      context,
      response: void 0,
      error: void 0,
      internal: plugin.internal ?? {}
    };
    return runRequest(request, [
      ...beforeMiddlewares
    ], lambdaHandler, [
      ...afterMiddlewares
    ], [
      ...onErrorMiddlewares
    ], plugin);
  };
  const middy2 = plugin.streamifyResponse ? awslambda.streamifyResponse(async (event, responseStream, context) => {
    const handlerResponse = await middyHandler(event, context);
    let handlerBody = handlerResponse;
    if (handlerResponse.statusCode) {
      handlerBody = handlerResponse.body ?? "";
      responseStream = awslambda.HttpResponseStream.from(responseStream, handlerResponse);
    }
    let handlerStream;
    if (handlerBody._readableState) {
      handlerStream = handlerBody;
    } else if (typeof handlerBody === "string") {
      function* iterator(input) {
        const size = 16384;
        let position = 0;
        const length = input.length;
        while (position < length) {
          yield input.substring(position, position + size);
          position += size;
        }
      }
      handlerStream = import_node_stream.Readable.from(iterator(handlerBody));
    }
    if (!handlerStream) {
      throw new Error("handler response not a ReadableStream");
    }
    await (0, import_promises.pipeline)(handlerStream, responseStream);
  }) : middyHandler;
  middy2.use = (middlewares) => {
    if (!Array.isArray(middlewares)) {
      middlewares = [
        middlewares
      ];
    }
    for (const middleware of middlewares) {
      const { before, after, onError } = middleware;
      if (!before && !after && !onError) {
        throw new Error('Middleware must be an object containing at least one key among "before", "after", "onError"');
      }
      if (before)
        middy2.before(before);
      if (after)
        middy2.after(after);
      if (onError)
        middy2.onError(onError);
    }
    return middy2;
  };
  middy2.before = (beforeMiddleware) => {
    beforeMiddlewares.push(beforeMiddleware);
    return middy2;
  };
  middy2.after = (afterMiddleware) => {
    afterMiddlewares.unshift(afterMiddleware);
    return middy2;
  };
  middy2.onError = (onErrorMiddleware) => {
    onErrorMiddlewares.unshift(onErrorMiddleware);
    return middy2;
  };
  middy2.handler = (replaceLambdaHandler) => {
    lambdaHandler = replaceLambdaHandler;
    return middy2;
  };
  return middy2;
};
var runRequest = async (request, beforeMiddlewares, lambdaHandler, afterMiddlewares, onErrorMiddlewares, plugin) => {
  let timeoutAbort;
  const timeoutEarly = plugin.timeoutEarly && request.context.getRemainingTimeInMillis;
  try {
    await runMiddlewares(request, beforeMiddlewares, plugin);
    if (typeof request.response === "undefined") {
      plugin.beforeHandler?.();
      const handlerAbort = new AbortController();
      if (timeoutEarly)
        timeoutAbort = new AbortController();
      request.response = await Promise.race([
        lambdaHandler(request.event, request.context, {
          signal: handlerAbort.signal
        }),
        timeoutEarly ? (0, import_promises2.setTimeout)(request.context.getRemainingTimeInMillis() - plugin.timeoutEarlyInMillis, void 0, {
          signal: timeoutAbort.signal
        }).then(() => {
          handlerAbort.abort();
          return plugin.timeoutEarlyResponse();
        }) : Promise.race([])
      ]);
      timeoutAbort?.abort();
      plugin.afterHandler?.();
      await runMiddlewares(request, afterMiddlewares, plugin);
    }
  } catch (e) {
    timeoutAbort?.abort();
    request.response = void 0;
    request.error = e;
    try {
      await runMiddlewares(request, onErrorMiddlewares, plugin);
    } catch (e2) {
      e2.originalError = request.error;
      request.error = e2;
      throw request.error;
    }
    if (typeof request.response === "undefined")
      throw request.error;
  } finally {
    await plugin.requestEnd?.(request);
  }
  return request.response;
};
var runMiddlewares = async (request, middlewares, plugin) => {
  for (const nextMiddleware of middlewares) {
    plugin.beforeMiddleware?.(nextMiddleware.name);
    const res = await nextMiddleware(request);
    plugin.afterMiddleware?.(nextMiddleware.name);
    if (typeof res !== "undefined") {
      request.response = res;
      return;
    }
  }
};
var core_default = middy;

// node_modules/@middy/util/index.js
var createErrorRegexp = /[^a-zA-Z]/g;
var HttpError = class extends Error {
  constructor(code, message, options = {}) {
    if (message && typeof message !== "string") {
      options = message;
      message = void 0;
    }
    message ??= httpErrorCodes[code];
    super(message, options);
    const name = httpErrorCodes[code].replace(createErrorRegexp, "");
    this.name = name.substr(-5) !== "Error" ? name + "Error" : name;
    this.status = this.statusCode = code;
    this.expose = options.expose ?? code < 500;
  }
};
var createError = (code, message, properties = {}) => {
  return new HttpError(code, message, properties);
};
var httpErrorCodes = {
  100: "Continue",
  101: "Switching Protocols",
  102: "Processing",
  103: "Early Hints",
  200: "OK",
  201: "Created",
  202: "Accepted",
  203: "Non-Authoritative Information",
  204: "No Content",
  205: "Reset Content",
  206: "Partial Content",
  207: "Multi-Status",
  208: "Already Reported",
  226: "IM Used",
  300: "Multiple Choices",
  301: "Moved Permanently",
  302: "Found",
  303: "See Other",
  304: "Not Modified",
  305: "Use Proxy",
  306: "(Unused)",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  421: "Misdirected Request",
  422: "Unprocessable Entity",
  423: "Locked",
  424: "Failed Dependency",
  425: "Unordered Collection",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  451: "Unavailable For Legal Reasons",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  509: "Bandwidth Limit Exceeded",
  510: "Not Extended",
  511: "Network Authentication Required"
};

// node_modules/@middy/http-json-body-parser/index.js
var mimePattern = /^application\/(.+\+)?json($|;.+)/;
var defaults = {
  reviver: void 0,
  disableContentTypeError: true
};
var httpJsonBodyParserMiddleware = (opts = {}) => {
  const options = {
    ...defaults,
    ...opts
  };
  const httpJsonBodyParserMiddlewareBefore = async (request) => {
    const { headers, body } = request.event;
    const contentType = headers?.["Content-Type"] ?? headers?.["content-type"];
    if (!mimePattern.test(contentType)) {
      if (options.disableContentTypeError) {
        return;
      }
      throw createError(415, "Unsupported Media Type", {
        cause: contentType
      });
    }
    try {
      const data = request.event.isBase64Encoded ? Buffer.from(body, "base64").toString() : body;
      request.event.body = JSON.parse(data, options.reviver);
    } catch (cause) {
      throw createError(415, "Invalid or malformed JSON was provided", {
        cause
      });
    }
  };
  return {
    before: httpJsonBodyParserMiddlewareBefore
  };
};
var http_json_body_parser_default = httpJsonBodyParserMiddleware;

// src/libs/lambda.ts
var middyfy = (handler) => {
  return core_default(handler).use(http_json_body_parser_default());
};

// src/libs/clients.ts
var import_serverless_postgres = __toESM(require_serverless_postgres());
var import_redis = __toESM(require_dist8());
var {
  PG_HOST,
  PG_DATABASE,
  PG_PORT,
  PG_USER,
  PG_PASSWORD,
  REDIS_URL
} = process.env;
var pgClient = new import_serverless_postgres.default({
  user: PG_USER,
  host: PG_HOST,
  database: PG_DATABASE,
  password: PG_PASSWORD,
  port: Number(PG_PORT),
  debug: true,
  ssl: { rejectUnauthorized: false }
});
var redisClient = (0, import_redis.createClient)({ url: "redis://" + REDIS_URL + ":6379" });

// src/functions/recover/controller.ts
function validateBody(body) {
  const token = body.token;
  if (typeof token === "string" && token.length === 16)
    return true;
  return "invalid token ";
}
async function getCard(token, pk) {
  if (!redisClient.isOpen)
    await redisClient.connect();
  const value = await redisClient.get(token);
  if (!value)
    return null;
  const card = JSON.parse(value);
  if (card.pk !== pk)
    return null;
  const { cvv, ...copy } = card;
  return copy;
}

// src/libs/helpers.ts
var import_node_crypto = __toESM(require("node:crypto"));
import_node_crypto.default.getRandomValues(Buffer.allocUnsafe(21));

// src/libs/nanoid.ts
var import_node_crypto2 = __toESM(require("node:crypto"));
var POOL_SIZE_MULTIPLIER = 128;
var pool;
var poolOffset;
function fillPool(bytes) {
  if (!pool || pool.length < bytes) {
    pool = Buffer.allocUnsafe(bytes * POOL_SIZE_MULTIPLIER);
    import_node_crypto2.default.getRandomValues(pool);
    poolOffset = 0;
  } else if (poolOffset + bytes > pool.length) {
    import_node_crypto2.default.getRandomValues(pool);
    poolOffset = 0;
  }
  poolOffset += bytes;
}
function random(bytes) {
  fillPool(bytes -= 0);
  return pool.subarray(poolOffset - bytes, poolOffset);
}
function customRandom(alphabet, defaultSize, getRandom) {
  let mask = (2 << 31 - Math.clz32(alphabet.length - 1 | 1)) - 1;
  let step = Math.ceil(1.6 * mask * defaultSize / alphabet.length);
  return (size = defaultSize) => {
    let id = "";
    while (true) {
      let bytes = getRandom(step);
      let i = step;
      while (i--) {
        id += alphabet[bytes[i] & mask] || "";
        if (id.length === size)
          return id;
      }
    }
  };
}
function customAlphabet(alphabet, size = 21) {
  return customRandom(alphabet, size, random);
}

// src/functions/tokens/controller.ts
var nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", 16);
var pk_prefix = "pk_test_";
function getPK(headers) {
  const authorization = headers.authorization || headers.Authorization;
  if (!authorization)
    return false;
  const token = authorization.replace(/^Bearer\s+/, "");
  if (!token)
    return false;
  if (!token.startsWith(pk_prefix))
    return false;
  const alpha_num = token.substring(pk_prefix.length);
  if (!/^[a-zA-Z0-9]{16}$/.test(alpha_num))
    return false;
  return token;
}

// src/functions/recover/handler.ts
var restore = async (event) => {
  const isValid = validateBody(event.body);
  if (typeof isValid === "string")
    return jsonError(isValid);
  const pk = getPK(event.headers);
  if (pk === false)
    return jsonError("invalid pk");
  const token = event.body.token;
  const card = await getCard(token, pk);
  if (!card)
    return jsonError("invalid or expired token");
  return formatJSONResponse({
    status: "ok",
    card
  });
};
var main = middyfy(restore);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main
});
/*! Bundled license information:

serverless-postgres/src/index.js:
  (**
   * This module manages PostgreSQL connections in serverless applications.
   * This module wrap node-postgres package, more detail regarding it can be found here:
   * https://github.com/brianc/node-postgres
   * @author Matteo Gioioso <matteo@hirvitek.com>
   * @license MIT
   *)
*/
//# sourceMappingURL=handler.js.map
