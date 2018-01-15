'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (initialOptions) {
  var options = Object.assign({}, {
    ascent: undefined,
    centerHorizontally: false,
    cssFontPath: '/static/fonts/',
    descent: 0,
    fixedWidth: false,
    fontHeight: null,
    fontId: null,
    fontName: 'iconfont',
    fontStyle: '',
    fontWeight: '',
    formats: ['svg', 'ttf', 'eot', 'woff', 'woff2'],
    formatsOptions: {
      ttf: {
        copyright: null,
        ts: null,
        version: null
      }
    },
    glyphTransformFn: null,
    maxConcurrency: _os2.default.cpus().length,
    metadata: null,
    metadataProvider: null,
    normalize: false,
    prependUnicode: false,
    round: 10e12,
    startUnicode: 0xea01,
    template: 'scss',
    verbose: false
  }, initialOptions);
  var svgs = options.svgs;

  var glyphsData = [];

  return (0, _globby2.default)([].concat(svgs)).then(function (foundFiles) {
    var filteredFiles = foundFiles.filter(function (foundFile) {
      return _path2.default.extname(foundFile) === '.svg';
    });

    if (filteredFiles.length === 0) {
      throw new Error('Iconfont glob patterns specified did not match any svgs');
    }

    options.foundFiles = foundFiles;
    return getGlyphsData(foundFiles, options);
  }).then(function (returnedGlyphsData) {
    glyphsData = returnedGlyphsData;
    return svgIcons2svgFontFn(returnedGlyphsData, options);
  }).then(function (svgFont) {
    var result = {};
    result.svg = svgFont;
    result.ttf = Buffer.from((0, _svg2ttf2.default)(result.svg.toString(), options.formatsOptions && options.formatsOptions.ttf ? options.formatsOptions.ttf : {}).buffer);

    if (options.formats.indexOf('eot') !== -1) {
      result.eot = Buffer.from((0, _ttf2eot2.default)(result.ttf).buffer);
    }

    if (options.formats.indexOf('woff') !== -1) {
      result.woff = Buffer.from((0, _ttf2woff2.default)(result.ttf, {
        metadata: options.metadata
      }).buffer);
    }

    if (options.formats.indexOf('woff2') !== -1) {
      result.woff2 = (0, _ttf2woff4.default)(result.ttf);
    }

    return result;
  }).then(function (result) {
    var buildInTemplateDirectory = _path2.default.resolve(__dirname, './templates');

    return (0, _globby2.default)(buildInTemplateDirectory + '/**/*').then(function (buildInTemplates) {
      var supportedExtensions = buildInTemplates.map(function (buildInTemplate) {
        return _path2.default.extname(buildInTemplate.replace('.njk', ''));
      });

      var templateFilePath = options.template;

      if (supportedExtensions.indexOf('.' + options.template) !== -1) {
        result.usedBuildInStylesTemplate = true;
        _nunjucks2.default.configure(_path2.default.join(__dirname, '../'));
        templateFilePath = buildInTemplateDirectory + '/template.' + options.template + '.njk';
      } else {
        templateFilePath = _path2.default.resolve(templateFilePath);
      }

      var nunjucksOptions = Object.assign({}, {
        glyphs: glyphsData.map(function (glyphData) {
          if (typeof options.glyphTransformFn === 'function') {
            options.glyphTransformFn(glyphData.metadata);
          }
          return glyphData.metadata;
        })
      }, JSON.parse(JSON.stringify(options)), {
        fontName: options.fontName,
        fontPath: options.cssFontPath
      });

      result.styles = _nunjucks2.default.render(templateFilePath, nunjucksOptions);

      return result;
    }).then(function (result) {
      if (options.formats.indexOf('svg') === -1) {
        delete result.svg;
      }

      if (options.formats.indexOf('ttf') === -1) {
        delete result.ttf;
      }
      result.config = options;
      return result;
    });
  });
};

var _asyncThrottle = require('async-throttle');

var _asyncThrottle2 = _interopRequireDefault(_asyncThrottle);

var _metadata = require('svgicons2svgfont/src/metadata');

var _metadata2 = _interopRequireDefault(_metadata);

var _filesorter = require('svgicons2svgfont/src/filesorter');

var _filesorter2 = _interopRequireDefault(_filesorter);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _globby = require('globby');

var _globby2 = _interopRequireDefault(_globby);

var _nunjucks = require('nunjucks');

var _nunjucks2 = _interopRequireDefault(_nunjucks);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _stream = require('stream');

var _svgicons2svgfont = require('svgicons2svgfont');

var _svgicons2svgfont2 = _interopRequireDefault(_svgicons2svgfont);

var _svg2ttf = require('svg2ttf');

var _svg2ttf2 = _interopRequireDefault(_svg2ttf);

var _ttf2eot = require('ttf2eot');

var _ttf2eot2 = _interopRequireDefault(_ttf2eot);

var _ttf2woff = require('ttf2woff');

var _ttf2woff2 = _interopRequireDefault(_ttf2woff);

var _ttf2woff3 = require('ttf2woff2');

var _ttf2woff4 = _interopRequireDefault(_ttf2woff3);

var _xml2js = require('xml2js');

var _xml2js2 = _interopRequireDefault(_xml2js);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getGlyphsData(files, options) {
  var metadataProvider = options.metadataProvider || (0, _metadata2.default)({
    prependUnicode: options.prependUnicode,
    startUnicode: options.startUnicode
  });

  var sortedFiles = files.sort(function (fileA, fileB) {
    return (0, _filesorter2.default)(fileA, fileB);
  });
  var xmlParser = new _xml2js2.default.Parser();
  var throttle = (0, _asyncThrottle2.default)(options.maxConcurrency);

  return Promise.all(sortedFiles.map(function (srcPath) {
    return throttle(function () {
      return new Promise(function (resolve, reject) {
        var glyph = _fs2.default.createReadStream(srcPath);
        var glyphContents = '';

        return glyph.on('error', function (glyphError) {
          return reject(glyphError);
        }).on('data', function (data) {
          glyphContents += data.toString();
        }).on('end', function () {
          if (glyphContents.length === 0) {
            return reject(new Error('Empty file ' + srcPath));
          }

          return xmlParser.parseString(glyphContents, function (error) {
            if (error) {
              return reject(error);
            }

            var glyphData = {
              contents: glyphContents,
              srcPath: srcPath
            };

            return resolve(glyphData);
          });
        });
      });
    }).then(function (glyphData) {
      return new Promise(function (resolve, reject) {
        metadataProvider(glyphData.srcPath, function (error, metadata) {
          if (error) {
            return reject(error);
          }
          glyphData.metadata = metadata;
          return resolve(glyphData);
        });
      });
    });
  }));
}

function svgIcons2svgFontFn(glyphsData, options) {
  var result = '';

  return new Promise(function (resolve, reject) {
    var fontStream = (0, _svgicons2svgfont2.default)({
      ascent: options.ascent,
      centerHorizontally: options.centerHorizontally,
      descent: options.descent,
      fixedWidth: options.fixedWidth,
      fontHeight: options.fontHeight,
      fontId: options.fontId,
      fontName: options.fontName,
      fontStyle: options.fontStyle,
      fontWeight: options.fontWeight,
      // eslint-disable-next-line no-console, no-empty-function
      log: options.vebose ? console.log.bind(console) : function () {},
      metadata: options.metadata,
      normalize: options.normalize,
      round: options.round
    }).on('finish', function () {
      return resolve(result);
    }).on('data', function (data) {
      result += data;
    }).on('error', function (error) {
      return reject(error);
    });

    glyphsData.forEach(function (glyphData) {
      var glyphStream = new _stream.Readable();

      glyphStream.push(glyphData.contents);
      glyphStream.push(null);

      glyphStream.metadata = glyphData.metadata;

      fontStream.write(glyphStream);
    });

    fontStream.end();
  });
}

module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9nZW5lcmF0b3IuanMiXSwibmFtZXMiOlsiaW5pdGlhbE9wdGlvbnMiLCJvcHRpb25zIiwiT2JqZWN0IiwiYXNzaWduIiwiYXNjZW50IiwidW5kZWZpbmVkIiwiY2VudGVySG9yaXpvbnRhbGx5IiwiY3NzRm9udFBhdGgiLCJkZXNjZW50IiwiZml4ZWRXaWR0aCIsImZvbnRIZWlnaHQiLCJmb250SWQiLCJmb250TmFtZSIsImZvbnRTdHlsZSIsImZvbnRXZWlnaHQiLCJmb3JtYXRzIiwiZm9ybWF0c09wdGlvbnMiLCJ0dGYiLCJjb3B5cmlnaHQiLCJ0cyIsInZlcnNpb24iLCJnbHlwaFRyYW5zZm9ybUZuIiwibWF4Q29uY3VycmVuY3kiLCJjcHVzIiwibGVuZ3RoIiwibWV0YWRhdGEiLCJtZXRhZGF0YVByb3ZpZGVyIiwibm9ybWFsaXplIiwicHJlcGVuZFVuaWNvZGUiLCJyb3VuZCIsInN0YXJ0VW5pY29kZSIsInRlbXBsYXRlIiwidmVyYm9zZSIsInN2Z3MiLCJnbHlwaHNEYXRhIiwiY29uY2F0IiwidGhlbiIsImZpbHRlcmVkRmlsZXMiLCJmb3VuZEZpbGVzIiwiZmlsdGVyIiwiZXh0bmFtZSIsImZvdW5kRmlsZSIsIkVycm9yIiwiZ2V0R2x5cGhzRGF0YSIsInJldHVybmVkR2x5cGhzRGF0YSIsInN2Z0ljb25zMnN2Z0ZvbnRGbiIsInJlc3VsdCIsInN2ZyIsInN2Z0ZvbnQiLCJCdWZmZXIiLCJmcm9tIiwidG9TdHJpbmciLCJidWZmZXIiLCJpbmRleE9mIiwiZW90Iiwid29mZiIsIndvZmYyIiwiYnVpbGRJblRlbXBsYXRlRGlyZWN0b3J5IiwicmVzb2x2ZSIsIl9fZGlybmFtZSIsInN1cHBvcnRlZEV4dGVuc2lvbnMiLCJidWlsZEluVGVtcGxhdGVzIiwibWFwIiwiYnVpbGRJblRlbXBsYXRlIiwicmVwbGFjZSIsInRlbXBsYXRlRmlsZVBhdGgiLCJ1c2VkQnVpbGRJblN0eWxlc1RlbXBsYXRlIiwiY29uZmlndXJlIiwiam9pbiIsIm51bmp1Y2tzT3B0aW9ucyIsImdseXBocyIsImdseXBoRGF0YSIsIkpTT04iLCJwYXJzZSIsInN0cmluZ2lmeSIsImZvbnRQYXRoIiwic3R5bGVzIiwicmVuZGVyIiwiY29uZmlnIiwiZmlsZXMiLCJzb3J0ZWRGaWxlcyIsInNvcnQiLCJmaWxlQSIsImZpbGVCIiwieG1sUGFyc2VyIiwiUGFyc2VyIiwidGhyb3R0bGUiLCJQcm9taXNlIiwiYWxsIiwicmVqZWN0IiwiZ2x5cGgiLCJjcmVhdGVSZWFkU3RyZWFtIiwic3JjUGF0aCIsImdseXBoQ29udGVudHMiLCJvbiIsImdseXBoRXJyb3IiLCJkYXRhIiwicGFyc2VTdHJpbmciLCJlcnJvciIsImNvbnRlbnRzIiwiZm9udFN0cmVhbSIsImxvZyIsInZlYm9zZSIsImNvbnNvbGUiLCJiaW5kIiwiZm9yRWFjaCIsImdseXBoU3RyZWFtIiwicHVzaCIsIndyaXRlIiwiZW5kIl0sIm1hcHBpbmdzIjoiOzs7Ozs7a0JBcUhlLFVBQVNBLGNBQVQsRUFBeUI7QUFDdEMsTUFBSUMsVUFBVUMsT0FBT0MsTUFBUCxDQUNaLEVBRFksRUFFWjtBQUNFQyxZQUFRQyxTQURWO0FBRUVDLHdCQUFvQixLQUZ0QjtBQUdFQyxpQkFBYSxnQkFIZjtBQUlFQyxhQUFTLENBSlg7QUFLRUMsZ0JBQVksS0FMZDtBQU1FQyxnQkFBWSxJQU5kO0FBT0VDLFlBQVEsSUFQVjtBQVFFQyxjQUFVLFVBUlo7QUFTRUMsZUFBVyxFQVRiO0FBVUVDLGdCQUFZLEVBVmQ7QUFXRUMsYUFBUyxDQUFDLEtBQUQsRUFBUSxLQUFSLEVBQWUsS0FBZixFQUFzQixNQUF0QixFQUE4QixPQUE5QixDQVhYO0FBWUVDLG9CQUFnQjtBQUNkQyxXQUFLO0FBQ0hDLG1CQUFXLElBRFI7QUFFSEMsWUFBSSxJQUZEO0FBR0hDLGlCQUFTO0FBSE47QUFEUyxLQVpsQjtBQW1CRUMsc0JBQWtCLElBbkJwQjtBQW9CRUMsb0JBQWdCLGFBQUdDLElBQUgsR0FBVUMsTUFwQjVCO0FBcUJFQyxjQUFVLElBckJaO0FBc0JFQyxz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dGVudCI6WyJpbXBvcnQgY3JlYXRlVGhyb3R0bGUgZnJvbSAnYXN5bmMtdGhyb3R0bGUnXG5pbXBvcnQgZGVmYXVsdE1ldGFkYXRhUHJvdmlkZXIgZnJvbSAnc3ZnaWNvbnMyc3ZnZm9udC9zcmMvbWV0YWRhdGEnXG5pbXBvcnQgZmlsZVNvcnRlciBmcm9tICdzdmdpY29uczJzdmdmb250L3NyYy9maWxlc29ydGVyJ1xuaW1wb3J0IGZzIGZyb20gJ2ZzJ1xuaW1wb3J0IGdsb2JieSBmcm9tICdnbG9iYnknXG5pbXBvcnQgbnVuanVja3MgZnJvbSAnbnVuanVja3MnXG5pbXBvcnQgb3MgZnJvbSAnb3MnXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IHsgUmVhZGFibGUgfSBmcm9tICdzdHJlYW0nXG5pbXBvcnQgc3ZnaWNvbnMyc3ZnZm9udCBmcm9tICdzdmdpY29uczJzdmdmb250J1xuaW1wb3J0IHN2ZzJ0dGYgZnJvbSAnc3ZnMnR0ZidcbmltcG9ydCB0dGYyZW90IGZyb20gJ3R0ZjJlb3QnXG5pbXBvcnQgdHRmMndvZmYgZnJvbSAndHRmMndvZmYnXG5pbXBvcnQgdHRmMndvZmYyIGZyb20gJ3R0ZjJ3b2ZmMidcbmltcG9ydCB4bWwyanMgZnJvbSAneG1sMmpzJ1xuXG5mdW5jdGlvbiBnZXRHbHlwaHNEYXRhKGZpbGVzLCBvcHRpb25zKSB7XG4gIGNvbnN0IG1ldGFkYXRhUHJvdmlkZXIgPVxuICAgIG9wdGlvbnMubWV0YWRhdGFQcm92aWRlciB8fFxuICAgIGRlZmF1bHRNZXRhZGF0YVByb3ZpZGVyKHtcbiAgICAgIHByZXBlbmRVbmljb2RlOiBvcHRpb25zLnByZXBlbmRVbmljb2RlLFxuICAgICAgc3RhcnRVbmljb2RlOiBvcHRpb25zLnN0YXJ0VW5pY29kZSxcbiAgICB9KVxuXG4gIGNvbnN0IHNvcnRlZEZpbGVzID0gZmlsZXMuc29ydCgoZmlsZUEsIGZpbGVCKSA9PiBmaWxlU29ydGVyKGZpbGVBLCBmaWxlQikpXG4gIGNvbnN0IHhtbFBhcnNlciA9IG5ldyB4bWwyanMuUGFyc2VyKClcbiAgY29uc3QgdGhyb3R0bGUgPSBjcmVhdGVUaHJvdHRsZShvcHRpb25zLm1heENvbmN1cnJlbmN5KVxuXG4gIHJldHVybiBQcm9taXNlLmFsbChcbiAgICBzb3J0ZWRGaWxlcy5tYXAoc3JjUGF0aCA9PlxuICAgICAgdGhyb3R0bGUoXG4gICAgICAgICgpID0+XG4gICAgICAgICAgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZ2x5cGggPSBmcy5jcmVhdGVSZWFkU3RyZWFtKHNyY1BhdGgpXG4gICAgICAgICAgICBsZXQgZ2x5cGhDb250ZW50cyA9ICcnXG5cbiAgICAgICAgICAgIHJldHVybiBnbHlwaFxuICAgICAgICAgICAgICAub24oJ2Vycm9yJywgZ2x5cGhFcnJvciA9PiByZWplY3QoZ2x5cGhFcnJvcikpXG4gICAgICAgICAgICAgIC5vbignZGF0YScsIGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgIGdseXBoQ29udGVudHMgKz0gZGF0YS50b1N0cmluZygpXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChnbHlwaENvbnRlbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoYEVtcHR5IGZpbGUgJHtzcmNQYXRofWApKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiB4bWxQYXJzZXIucGFyc2VTdHJpbmcoZ2x5cGhDb250ZW50cywgZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoZXJyb3IpXG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGNvbnN0IGdseXBoRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudHM6IGdseXBoQ29udGVudHMsXG4gICAgICAgICAgICAgICAgICAgIHNyY1BhdGgsXG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIHJldHVybiByZXNvbHZlKGdseXBoRGF0YSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgIH0pXG4gICAgICApLnRoZW4oXG4gICAgICAgIGdseXBoRGF0YSA9PlxuICAgICAgICAgIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIG1ldGFkYXRhUHJvdmlkZXIoZ2x5cGhEYXRhLnNyY1BhdGgsIChlcnJvciwgbWV0YWRhdGEpID0+IHtcbiAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChlcnJvcilcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBnbHlwaERhdGEubWV0YWRhdGEgPSBtZXRhZGF0YVxuICAgICAgICAgICAgICByZXR1cm4gcmVzb2x2ZShnbHlwaERhdGEpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0pXG4gICAgICApXG4gICAgKVxuICApXG59XG5cbmZ1bmN0aW9uIHN2Z0ljb25zMnN2Z0ZvbnRGbihnbHlwaHNEYXRhLCBvcHRpb25zKSB7XG4gIGxldCByZXN1bHQgPSAnJ1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgZm9udFN0cmVhbSA9IHN2Z2ljb25zMnN2Z2ZvbnQoe1xuICAgICAgYXNjZW50OiBvcHRpb25zLmFzY2VudCxcbiAgICAgIGNlbnRlckhvcml6b250YWxseTogb3B0aW9ucy5jZW50ZXJIb3Jpem9udGFsbHksXG4gICAgICBkZXNjZW50OiBvcHRpb25zLmRlc2NlbnQsXG4gICAgICBmaXhlZFdpZHRoOiBvcHRpb25zLmZpeGVkV2lkdGgsXG4gICAgICBmb250SGVpZ2h0OiBvcHRpb25zLmZvbnRIZWlnaHQsXG4gICAgICBmb250SWQ6IG9wdGlvbnMuZm9udElkLFxuICAgICAgZm9udE5hbWU6IG9wdGlvbnMuZm9udE5hbWUsXG4gICAgICBmb250U3R5bGU6IG9wdGlvbnMuZm9udFN0eWxlLFxuICAgICAgZm9udFdlaWdodDogb3B0aW9ucy5mb250V2VpZ2h0LFxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGUsIG5vLWVtcHR5LWZ1bmN0aW9uXG4gICAgICBsb2c6IG9wdGlvbnMudmVib3NlID8gY29uc29sZS5sb2cuYmluZChjb25zb2xlKSA6ICgpID0+IHt9LFxuICAgICAgbWV0YWRhdGE6IG9wdGlvbnMubWV0YWRhdGEsXG4gICAgICBub3JtYWxpemU6IG9wdGlvbnMubm9ybWFsaXplLFxuICAgICAgcm91bmQ6IG9wdGlvbnMucm91bmQsXG4gICAgfSlcbiAgICAgIC5vbignZmluaXNoJywgKCkgPT4gcmVzb2x2ZShyZXN1bHQpKVxuICAgICAgLm9uKCdkYXRhJywgZGF0YSA9PiB7XG4gICAgICAgIHJlc3VsdCArPSBkYXRhXG4gICAgICB9KVxuICAgICAgLm9uKCdlcnJvcicsIGVycm9yID0+IHJlamVjdChlcnJvcikpXG5cbiAgICBnbHlwaHNEYXRhLmZvckVhY2goZ2x5cGhEYXRhID0+IHtcbiAgICAgIGNvbnN0IGdseXBoU3RyZWFtID0gbmV3IFJlYWRhYmxlKClcblxuICAgICAgZ2x5cGhTdHJlYW0ucHVzaChnbHlwaERhdGEuY29udGVudHMpXG4gICAgICBnbHlwaFN0cmVhbS5wdXNoKG51bGwpXG5cbiAgICAgIGdseXBoU3RyZWFtLm1ldGFkYXRhID0gZ2x5cGhEYXRhLm1ldGFkYXRhXG5cbiAgICAgIGZvbnRTdHJlYW0ud3JpdGUoZ2x5cGhTdHJlYW0pXG4gICAgfSlcblxuICAgIGZvbnRTdHJlYW0uZW5kKClcbiAgfSlcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5pdGlhbE9wdGlvbnMpIHtcbiAgbGV0IG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKFxuICAgIHt9LFxuICAgIHtcbiAgICAgIGFzY2VudDogdW5kZWZpbmVkLFxuICAgICAgY2VudGVySG9yaXpvbnRhbGx5OiBmYWxzZSxcbiAgICAgIGNzc0ZvbnRQYXRoOiAnL3N0YXRpYy9mb250cy8nLFxuICAgICAgZGVzY2VudDogMCxcbiAgICAgIGZpeGVkV2lkdGg6IGZhbHNlLFxuICAgICAgZm9udEhlaWdodDogbnVsbCxcbiAgICAgIGZvbnRJZDogbnVsbCxcbiAgICAgIGZvbnROYW1lOiAnaWNvbmZvbnQnLFxuICAgICAgZm9udFN0eWxlOiAnJyxcbiAgICAgIGZvbnRXZWlnaHQ6ICcnLFxuICAgICAgZm9ybWF0czogWydzdmcnLCAndHRmJywgJ2VvdCcsICd3b2ZmJywgJ3dvZmYyJ10sXG4gICAgICBmb3JtYXRzT3B0aW9uczoge1xuICAgICAgICB0dGY6IHtcbiAgICAgICAgICBjb3B5cmlnaHQ6IG51bGwsXG4gICAgICAgICAgdHM6IG51bGwsXG4gICAgICAgICAgdmVyc2lvbjogbnVsbCxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBnbHlwaFRyYW5zZm9ybUZuOiBudWxsLFxuICAgICAgbWF4Q29uY3VycmVuY3k6IG9zLmNwdXMoKS5sZW5ndGgsXG4gICAgICBtZXRhZGF0YTogbnVsbCxcbiAgICAgIG1ldGFkYXRhUHJvdmlkZXI6IG51bGwsXG4gICAgICBub3JtYWxpemU6IGZhbHNlLFxuICAgICAgcHJlcGVuZFVuaWNvZGU6IGZhbHNlLFxuICAgICAgcm91bmQ6IDEwZTEyLFxuICAgICAgc3RhcnRVbmljb2RlOiAweGVhMDEsXG4gICAgICB0ZW1wbGF0ZTogJ3Njc3MnLFxuICAgICAgdmVyYm9zZTogZmFsc2UsXG4gICAgfSxcbiAgICBpbml0aWFsT3B0aW9uc1xuICApXG4gIGNvbnN0IHsgc3ZncyB9ID0gb3B0aW9uc1xuICBsZXQgZ2x5cGhzRGF0YSA9IFtdXG5cbiAgcmV0dXJuIGdsb2JieShbXS5jb25jYXQoc3ZncykpXG4gICAgLnRoZW4oZm91bmRGaWxlcyA9PiB7XG4gICAgICBjb25zdCBmaWx0ZXJlZEZpbGVzID0gZm91bmRGaWxlcy5maWx0ZXIoZm91bmRGaWxlID0+IHBhdGguZXh0bmFtZShmb3VuZEZpbGUpID09PSAnLnN2ZycpXG5cbiAgICAgIGlmIChmaWx0ZXJlZEZpbGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ljb25mb250IGdsb2IgcGF0dGVybnMgc3BlY2lmaWVkIGRpZCBub3QgbWF0Y2ggYW55IHN2Z3MnKVxuICAgICAgfVxuXG4gICAgICBvcHRpb25zLmZvdW5kRmlsZXMgPSBmb3VuZEZpbGVzXG4gICAgICByZXR1cm4gZ2V0R2x5cGhzRGF0YShmb3VuZEZpbGVzLCBvcHRpb25zKVxuICAgIH0pXG4gICAgLnRoZW4ocmV0dXJuZWRHbHlwaHNEYXRhID0+IHtcbiAgICAgIGdseXBoc0RhdGEgPSByZXR1cm5lZEdseXBoc0RhdGFcbiAgICAgIHJldHVybiBzdmdJY29uczJzdmdGb250Rm4ocmV0dXJuZWRHbHlwaHNEYXRhLCBvcHRpb25zKVxuICAgIH0pXG4gICAgLnRoZW4oc3ZnRm9udCA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSB7fVxuICAgICAgcmVzdWx0LnN2ZyA9IHN2Z0ZvbnRcbiAgICAgIHJlc3VsdC50dGYgPSBCdWZmZXIuZnJvbShcbiAgICAgICAgc3ZnMnR0ZihcbiAgICAgICAgICByZXN1bHQuc3ZnLnRvU3RyaW5nKCksXG4gICAgICAgICAgb3B0aW9ucy5mb3JtYXRzT3B0aW9ucyAmJiBvcHRpb25zLmZvcm1hdHNPcHRpb25zLnR0ZiA/IG9wdGlvbnMuZm9ybWF0c09wdGlvbnMudHRmIDoge31cbiAgICAgICAgKS5idWZmZXJcbiAgICAgIClcblxuICAgICAgaWYgKG9wdGlvbnMuZm9ybWF0cy5pbmRleE9mKCdlb3QnKSAhPT0gLTEpIHtcbiAgICAgICAgcmVzdWx0LmVvdCA9IEJ1ZmZlci5mcm9tKHR0ZjJlb3QocmVzdWx0LnR0ZikuYnVmZmVyKVxuICAgICAgfVxuXG4gICAgICBpZiAob3B0aW9ucy5mb3JtYXRzLmluZGV4T2YoJ3dvZmYnKSAhPT0gLTEpIHtcbiAgICAgICAgcmVzdWx0LndvZmYgPSBCdWZmZXIuZnJvbShcbiAgICAgICAgICB0dGYyd29mZihyZXN1bHQudHRmLCB7XG4gICAgICAgICAgICBtZXRhZGF0YTogb3B0aW9ucy5tZXRhZGF0YSxcbiAgICAgICAgICB9KS5idWZmZXJcbiAgICAgICAgKVxuICAgICAgfVxuXG4gICAgICBpZiAob3B0aW9ucy5mb3JtYXRzLmluZGV4T2YoJ3dvZmYyJykgIT09IC0xKSB7XG4gICAgICAgIHJlc3VsdC53b2ZmMiA9IHR0ZjJ3b2ZmMihyZXN1bHQudHRmKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfSlcbiAgICAudGhlbihyZXN1bHQgPT4ge1xuICAgICAgY29uc3QgYnVpbGRJblRlbXBsYXRlRGlyZWN0b3J5ID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vdGVtcGxhdGVzJylcblxuICAgICAgcmV0dXJuIGdsb2JieShgJHtidWlsZEluVGVtcGxhdGVEaXJlY3Rvcnl9LyoqLypgKVxuICAgICAgICAudGhlbihidWlsZEluVGVtcGxhdGVzID0+IHtcbiAgICAgICAgICBjb25zdCBzdXBwb3J0ZWRFeHRlbnNpb25zID0gYnVpbGRJblRlbXBsYXRlcy5tYXAoYnVpbGRJblRlbXBsYXRlID0+XG4gICAgICAgICAgICBwYXRoLmV4dG5hbWUoYnVpbGRJblRlbXBsYXRlLnJlcGxhY2UoJy5uamsnLCAnJykpXG4gICAgICAgICAgKVxuXG4gICAgICAgICAgbGV0IHRlbXBsYXRlRmlsZVBhdGggPSBvcHRpb25zLnRlbXBsYXRlXG5cbiAgICAgICAgICBpZiAoc3VwcG9ydGVkRXh0ZW5zaW9ucy5pbmRleE9mKGAuJHtvcHRpb25zLnRlbXBsYXRlfWApICE9PSAtMSkge1xuICAgICAgICAgICAgcmVzdWx0LnVzZWRCdWlsZEluU3R5bGVzVGVtcGxhdGUgPSB0cnVlXG4gICAgICAgICAgICBudW5qdWNrcy5jb25maWd1cmUocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLycpKVxuICAgICAgICAgICAgdGVtcGxhdGVGaWxlUGF0aCA9IGAke2J1aWxkSW5UZW1wbGF0ZURpcmVjdG9yeX0vdGVtcGxhdGUuJHtvcHRpb25zLnRlbXBsYXRlfS5uamtgXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRlbXBsYXRlRmlsZVBhdGggPSBwYXRoLnJlc29sdmUodGVtcGxhdGVGaWxlUGF0aClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBudW5qdWNrc09wdGlvbnMgPSBPYmplY3QuYXNzaWduKFxuICAgICAgICAgICAge30sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGdseXBoczogZ2x5cGhzRGF0YS5tYXAoZ2x5cGhEYXRhID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuZ2x5cGhUcmFuc2Zvcm1GbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgb3B0aW9ucy5nbHlwaFRyYW5zZm9ybUZuKGdseXBoRGF0YS5tZXRhZGF0YSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdseXBoRGF0YS5tZXRhZGF0YVxuICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZm9udE5hbWU6IG9wdGlvbnMuZm9udE5hbWUsXG4gICAgICAgICAgICAgIGZvbnRQYXRoOiBvcHRpb25zLmNzc0ZvbnRQYXRoLFxuICAgICAgICAgICAgfVxuICAgICAgICAgIClcblxuICAgICAgICAgIHJlc3VsdC5zdHlsZXMgPSBudW5qdWNrcy5yZW5kZXIodGVtcGxhdGVGaWxlUGF0aCwgbnVuanVja3NPcHRpb25zKVxuXG4gICAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgICB9KVxuICAgICAgICAudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgIGlmIChvcHRpb25zLmZvcm1hdHMuaW5kZXhPZignc3ZnJykgPT09IC0xKSB7XG4gICAgICAgICAgICBkZWxldGUgcmVzdWx0LnN2Z1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChvcHRpb25zLmZvcm1hdHMuaW5kZXhPZigndHRmJykgPT09IC0xKSB7XG4gICAgICAgICAgICBkZWxldGUgcmVzdWx0LnR0ZlxuICAgICAgICAgIH1cbiAgICAgICAgICByZXN1bHQuY29uZmlnID0gb3B0aW9uc1xuICAgICAgICAgIHJldHVybiByZXN1bHRcbiAgICAgICAgfSlcbiAgICB9KVxufVxuIl19