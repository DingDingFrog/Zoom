var landsatCollection = ee.ImageCollection("LANDSAT/LC08/C01/T1")
    .filterDate('2017-01-01', '2017-12-31').filterBounds(mangrove).filterMetadata('CLOUD_COVER_LAND', 'less_than', 30);
print('landsatCollection',landsatCollection)

var composite = ee.Algorithms.Landsat.simpleComposite({
  collection: landsatCollection,
  asFloat: true
});

print('composite', composite)

Map.addLayer(composite, {bands: ['B6', 'B5', 'B4'], max: 0.5, gamma: 2}, 'L8 Image', true);

var newfc =constructionland.merge(mangrove).merge(forest).merge(water).merge(cultivatedland).merge(unusedland);
print(newfc, 'newfc')

var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7'];

var training = composite.select(bands).sampleRegions({
  collection: newfc,
  properties: ['landcover'],
  scale: 30
});

var withRandom = training.randomColumn('random');

var split = 0.7;
var trainingPartition = withRandom.filter(ee.Filter.lt('random', split));
var testingPartition = withRandom.filter(ee.Filter.gte('random', split));

var classProperty = 'landcover'

var classifier = ee.Classifier.smileRandomForest(10).train({
  features: trainingPartition,
  classProperty: 'landcover',
  inputProperties: bands
});

var classified = composite.select(bands).classify(classifier);

var test = testingPartition.classify(classifier);

var confusionMatrix = test.errorMatrix('landcover', 'classification');
print('confusionMatrix',confusionMatrix);//面板上显示混淆矩阵
print('consumers accuracy',confusionMatrix.consumersAccuracy());
print('producers accuracy',confusionMatrix.producersAccuracy());
print('overall accuracy', confusionMatrix.accuracy());//面板上显示总体精度
print('kappa accuracy', confusionMatrix.kappa());//面板上显示kappa值

var smooth_map = classified
                    .focal_mode({
                      radius: 2, kernelType: 'octagon', units: 'pixels', iterations: 1
                    })
                    .mask(classified.gte(1))

var crude_object_removal = classified
                              .updateMask(classified.connectedPixelCount(2, false).gte(2))
                              .unmask(smooth_map)

var palette = [
  'f02f19', // mangrove (1)  
  '70ced6', // water(2)  
  '08c268', //  forest (3) 
  'ffeb62', //  constructionland (4) 
  'ff78d2', //  cultivatedland (5) 
  '0b4a8b',//  unudedland (6) 
];

Map.addLayer(classified, {min: 1, max:6, palette: palette}, 'Land Use Classification');

var styling={color:'red',fillColor:'00000000'}
var styling1={color:'yellow',fillColor:'00000000'}
Map.addLayer(mangrove,{},'ROI')
Map.setCenter(110.59, 19.96, 12);
