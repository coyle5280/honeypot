Ext.onReady(function () {
	west_menu = Ext.create("menu_panel",{
		listeners: {
			afterrender: function (){
				west_menu.setView(0);
			}
		}
	});
	center_panel = Ext.create("center_panel");
	this.pluginsArray = [];
	pluginsStore = {};
	var loadPlugins = function () {
		pluginsStore = Ext.create('Ext.data.Store', {
			storeId: "plugins",
			fields: [{name: 'value', type: "string"}, 
					 {name: 'display', type: "string"}, 
					 {name: 'orm', type: "string"}
					 ],
			proxy: {
				type: 'jsonp',
				url: CONFIG.url + '/',
				reader: {
					type: 'json',
					rootProperty: 'rows'
				},
				listeners: {
					exception: function(proxy, response, operation) {
						var message = "There was an error connecting to the Honey Pot Http server</br> @" + CONFIG.url
						Ext.create('widget.uxNotification', {
											title: 'Error Connecting to Server',
											position: 't',
											manager: 'Error',
											width: "35%",
											autoClose: false,
											spacing: 20,
											html: message
										}).show();
					}
				}
			},
			autoLoad: false
		});
		return pluginsStore;
	};
	/**
	 * This method creates a data store to hold the data for the overall 
	 * plugin table.  
	 * 
	 */
	var createAllStore = function () {
		var allStore = Ext.create('Ext.data.Store', {
			pageSize: this.CONFIG.myPageCountChoice,
			storeId: "all",
			fields: [{name: 'table', type: "string"}, 
					 {name: 'count', type: "integer"}
					 ],
			proxy: {
				type: 'jsonp',
				url: CONFIG.url + '/plugins',
				reader: {
					type: 'json',
					rootProperty: 'rows',
                    totalProperty: 'totalCount'
				}
			},
			autoLoad: false
		});
		return allStore;
	};
	
	/**
	 * This method creates a store to hold informaiton about the available plugins.
	 */
	var setupPluginStores = function () {
		var me = this;
		var pluginsStore = loadPlugins();
		pluginsStore.load(function(records, operation, success){
			var pluginCombo = center_panel.down("#pluginCombo");
			pluginCombo.bindStore(pluginsStore);
			pluginCombo.setValue('All');
			var pluginComboTable = center_panel.down("#pluginComboTable");
			pluginComboTable.bindStore(pluginsStore);
			pluginComboTable.setValue('All');
			var pluginComboAna = center_panel.down("#pluginComboAnalytics");
			pluginComboAna.bindStore(pluginsStore);
			pluginComboAna.setValue('All');
			var allStore = createAllStore();
			me.pluginsStore.each(function(item){
				createPluginStore(item);
				loadFeatureStores(item);
			});
			pluginsStore.add(
				{
					value: 'all', 
					display: 'All', 
					orm: '{"fields":[{"name":"table","type":"string"},{"name":"count","type":"integer"}]}',
					fields: {
						table: {
							column: [
								{name: 'table', type: "string"},{name: "count", type: "integer"}
							]
						}
					} 
				}
			);
			center_panel.grid_details_panel.grid_panel.setStoreColumns([{name: 'table', type: "string"},{name: "count", type: "integer"}], 'all');
			allStore.load(function(){
				createPieStore();
				createLineGraphStores(); 
			});
			Ext.get('loading').remove();
			Ext.get('loading-mask').fadeOut({
				remove: true
			});
		});
	};
	/**
	 * Create a data store for a plugin. Also calls createLineGraphStores 
	 * @param  {string} plugin
	 */
	var createPluginStore = function (plugin) {
		plugin.data.fields = (plugin.data.orm) ? JSON.parse(plugin.data.orm) : "";
		singlePluginStore = Ext.create('Ext.data.Store', {
			pageSize: this.CONFIG.myPageCountChoice,
			storeId: plugin.data.value,
			proxy: {
				type: 'jsonp',
				url: CONFIG.url + "/plugins/" + plugin.data.value + "",
				reader: {
					type: 'json',
					rootProperty: 'rows',
                    totalProperty: 'totalCount'
				},
				listeners: {
					exception: function(proxy, response, operation) {
						var message = "There was an error loading data for plugin " + plugin.data.value + "</br> @URL " + CONFIG.url
						Ext.create('widget.uxNotification', {
											title: 'Error Connecting to Server',
											position: 't',
											manager: 'Error',
											width: "35%",
											autoClose: false,
											spacing: 20,
											html: message
										}).show();
					}
				}
			},
			autoLoad: true
		});
		pluginsArray.push(singlePluginStore);
	};
	/**
	 * The feature store holds the data used to populate the individual plugin map layers
	 * @param  {string} plugin
	 */
	function loadFeatureStores(plugin) {
		singleFeatureStore = Ext.create('Ext.data.Store', {
			storeId: plugin.data.value + "features",
			proxy: {
				type: 'jsonp',
				url: CONFIG.url + "/plugins/" + plugin.data.value + "/" + "features",
				reader: {
					type: 'json',
					rootProperty: 'rows'
				},
				listeners: {
					exception: function(proxy, response, operation) {
						var message = "There was an error loading data for plugin " + plugin.data.value + "</br> @URL " + CONFIG.url
						Ext.create('widget.uxNotification', {
											title: 'Error loading features',
											position: 't',
											manager: 'Error',
											width: "35%",
											autoClose: false,
											spacing: 20,
											html: message
										}).show();
					}
				}
			},
			autoLoad: false
		});
		singleFeatureStore.load(function (items) {
			center_panel.map_panel.addPluginLayerToMap(plugin.data.value);		
		})	
	};
	/**
	 * This method creates all the stores needed for the analytics Line graph. 
	 * It uses the 'all' store to lookup what plugins need to be loaded.
	 */
	function createLineGraphStores() {
		var allLineGraphStore = Ext.create('Ext.data.Store', {
										storeId:  "allLineGraphStore",
										fields: [{name: 'day', type: "string"}, 
												 {name: 'data1', type: "int"}]
									});
		var dataAll = [{day: "Sunday", data1: 0},{day: "Monday", data1: 0},{day: "Tuesday", data1: 0},{day: "Wednesday", data1: 0},
						{day: "Thursday", data1: 0},{day: "Friday", data1: 0},{day: "Saturday", data1: 0}];
		var yGraphRange = 0;
		var pluginCount = 0;
		Ext.getStore('all').each(function (pluginItem){
			pluginCount++;
			var lineGraphStore = Ext.create('Ext.data.Store', {
										storeId: pluginItem.data.table + "LineGraphStore",
										fields: [{name: 'day', type: "string"}, 
												 {name: 'data1', type: "int"}],
										proxy: {
											type: 'jsonp',
											url: CONFIG.url + '/plugins/' + pluginItem.data.table + "/weekdata",
											reader: {
												type: 'json',
												rootProperty: 'rows'
											}
										},
										autoLoad: false
									});
				lineGraphStore.load(function (items) {
					pluginCount--;
					lineGraphStore.each(function (item) {
						switch(item.data.day){
							case "Sunday":
								dataAll[0].data1 += item.data.data1;
								yGraphRange = (yGraphRange < dataAll[0].data1) ? dataAll[0].data1 : yGraphRange;
								break;
							case "Monday":
								dataAll[1].data1 += item.data.data1;
								yGraphRange = (yGraphRange < dataAll[1].data1) ? dataAll[1].data1 : yGraphRange;
								break;
							case "Tuesday":
								dataAll[2].data1 += item.data.data1;
								yGraphRange = (yGraphRange < dataAll[2].data1) ? dataAll[2].data1 : yGraphRange;
								break;
							case "Wednesday":
								dataAll[3].data1 += item.data.data1;
								yGraphRange = (yGraphRange < dataAll[3].data1) ? dataAll[3].data1 : yGraphRange;
								break;
							case "Thursday":
								dataAll[4].data1 += item.data.data1;
								yGraphRange = (yGraphRange < dataAll[4].data1) ? dataAll[4].data1 : yGraphRange;
								break;
							case "Friday":
								dataAll[5].data1 += item.data.data1;
								yGraphRange = (yGraphRange < dataAll[5].data1) ? dataAll[5].data1 : yGraphRange;
								break;
							case "Saturday":
								dataAll[6].data1 += item.data.data1;
								yGraphRange = (yGraphRange < dataAll[6].data1) ? dataAll[6].data1 : yGraphRange;
								break;
							default:
								console.log("DATA ERROR IN LINE GRAPH DATA");
						}
					});
					if(pluginCount === 0){
						allLineGraphStore.loadRawData(dataAll, false);
						Ext.ComponentQuery.query('#lineGraph')[0].getAxes()[0].setMaximum(yGraphRange * 1.33);
						Ext.ComponentQuery.query('#lineGraph')[0].bindStore(allLineGraphStore);	
					}	
			});
		}, this);
	 	
    };
	setupPluginStores();
	/**
	 * This method creates the data store that will be used by the pie on the
	 * analytics page.
	 */
	function createPieStore() {
		var pieChartStore = Ext.create('Ext.data.Store', {
										storeId: "pieChartStore",
										fields: [{name: 'name', type: "string"}, 
												 {name: 'data1', type: "int"}
												 ]
									});
		var totalCount = 0;
		Ext.getStore('all').each(function (item){
			totalCount += item.data.count;
		}, this);
		Ext.getStore('all').each(function (item){
			var dataObject = {name: item.data.table, data1: (item.data.count / totalCount)*100};
			if(dataObject.data1 >= 99){
			   dataObject.data1 = 99 
			}else if (dataObject.data1 <= 1){
			   dataObject.data1 = 1  
			}
			pieChartStore.loadRawData(dataObject, true); 
		}, this);
		pieChartStore.commitChanges();
		Ext.ComponentQuery.query('#pieChart')[0].bindStore(pieChartStore);
		
	}; 
		
	center_panel.down("#pluginComboTable").on('select', function(combo, records, eOpts){
		center_panel.grid_details_panel.grid_panel.setStoreColumns(records.data.fields.table.column, records.data.value);
		var store = Ext.getStore(records.data.value);
		Ext.ComponentQuery.query('#pageBar')[0].bindStore(store);
	});
	
	center_panel.down("#pluginComboAnalytics").on('select', function(combo, records, eOpts){
		center_panel.down("#lineGraph").setLineGraphStore(records.data.value + "LineGraphStore");
	});
    
    center_panel.down("#map_table_button").on('change', function(segGroup, newValue, oldValue){
		center_panel.setView(newValue[0]);
		switch(newValue[0]){
			case 0:
				center_panel.down("#baseLayerCombo").show();
				center_panel.down("#pluginCombo").show();
				center_panel.down("#pluginComboTable").hide();
				center_panel.down("#pluginComboAnalytics").hide();
				break;
			case 1:
				center_panel.down("#pluginComboTable").show();
				center_panel.down("#pluginCombo").hide();
				center_panel.down("#baseLayerCombo").hide();
				center_panel.down("#pluginComboAnalytics").hide();
				break;
			case 2: 
				center_panel.down("#pluginComboAnalytics").show();
				center_panel.down("#pluginCombo").hide();
				center_panel.down("#baseLayerCombo").hide();
				center_panel.down("#pluginComboTable").hide();
				break;
			default:
               	console.log("ERROR");
		}
	});
	
	center_panel.down("#baseLayerCombo").on('select', function(combo, records, eOpts){
		center_panel.map_panel.changeBaseLayer(records.data.value); 
	});
	
	center_panel.down("#pluginCombo").on('select', function(combo, records, eOpts){
		center_panel.map_panel.displaySelectedPluginLayer(records.data.value);
	});
	
	center_panel.getLayout().setActiveItem(0);
	
	Ext.create('Ext.Viewport', {
		title: 'Honey Pot',
		layout: 'border',
		items: [center_panel]

	});
});
