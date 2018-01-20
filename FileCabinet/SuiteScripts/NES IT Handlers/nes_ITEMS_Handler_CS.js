/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */

// NO IN USE, to code GROUP...

define(['N/search','N/ui/message','N/ui/dialog'],
	function(search,message,dialog){

		function pageInit(context){

		}

		function validateField(context) {

			var currentRecord = context.currentRecord;
			var sublistName = context.sublistId;
			var sublistFieldName = context.fieldId;
			var line = context.line;

			if (sublistName === 'itemvendor') {

				if (sublistFieldName === 'vendorcode') {

					var theLine = currentRecord.selectLine({
						sublistId: sublistName,
						line: line
					});

					var vendorCode = currentRecord.getCurrentSublistValue({
						sublistId: sublistName,
						fieldId: sublistFieldName
					});

					var vendor = currentRecord.getCurrentSublistValue({
						sublistId: sublistName,
						fieldId: 'vendor'
					});
					var vendorText = currentRecord.getCurrentSublistText({
						sublistId: sublistName,
						fieldId: 'vendor'
					});

					if(vendor && vendorCode){
						var vendorDuplicate = translate(findVendorCode(vendor,vendorCode));
					}


					if (vendorDuplicate){
						if(vendorDuplicate.length > 0){

							alert('You can not use the code: '+vendorCode+' for Vendor: '+vendorText+' because that code is already in use on Item: '+vendorDuplicate[0].item);

							currentRecord.setCurrentSublistValue({
								sublistId: sublistName,
								fieldId: 'vendorcode',
								value: '',
								ignoreFieldChange: true
							});
							return false;
						}
					}

				}

			}

			return true;

		}

		function fieldChanged(context){

			var currentRecord = context.currentRecord;
			var sublistId = context.sublistId;
			var fieldId = context.fieldId;
			var line = context.line;

			if(fieldId === 'custitem_nes_item_class'){

				var myClass = currentRecord.getValue({
					fieldId: 'custitem_nes_item_class'
				});

				if (myClass === '3'){

					currentRecord.setValue({
						fieldId: 'custitem_nes_metal',
						value: 7,
						ignoreFieldChange: false
					});
					currentRecord.setValue({
						fieldId: 'custitem_nes_gender',
						value: 2,
						ignoreFieldChange: false
					});

				}

			}

		}

		function saveRecord(context) {
			var currentRecord = context.currentRecord;

			var myVendorLines = currentRecord.getLineCount({
				sublistId: 'itemvendor'
			});

			if (myVendorLines > 0){
				var showError = false;
				var preffered = false;
				for (var x =0; x < myVendorLines; x++){
					var theLine = currentRecord.selectLine({
						sublistId: 'itemvendor',
						line: x
					});

					var theCode = currentRecord.getCurrentSublistValue({
						sublistId: 'itemvendor',
						fieldId: 'vendorcode'
					});

					var thePrice = currentRecord.getCurrentSublistValue({
						sublistId: 'itemvendor',
						fieldId: 'purchaseprice'
					});

					var thePreffered = currentRecord.getCurrentSublistValue({
						sublistId: 'itemvendor',
						fieldId: 'preferredvendor'
					});

					if (!theCode || !thePrice){
						showError = true;
					}else if(thePreffered){
						preffered = true;
					}

				}

				if(showError){
					alert("You need to define the vendor code and price to create this Item!");
					return false;

				}else if(!preffered){

					var theFirstLine = currentRecord.selectLine({
						sublistId: 'itemvendor',
						line: 0
					});

					currentRecord.setCurrentSublistValue({
						sublistId: 'itemvendor',
						fieldId: 'preferredvendor',
						value: true,
						ignoreFieldChange: true
					});

					currentRecord.commitLine({
						sublistId: 'itemvendor'
					});

					return true;
				}

			}else{
				alert("You need to define at least one vendor to create this Item!");
				return false;
			}

			return true;
		}

		function findVendorCode(thevendor,thecode){

			var myVendor = thevendor ||'';
			var myCode = thecode || '';

			var filters = [
				['isinactive',search.Operator.IS, 'F'], 'AND',
				['type',search.Operator.ANYOF,["InvtPart","Assembly"]], 'AND',
				['othervendor',search.Operator.ANYOF, myVendor], 'AND',
				['vendorcode',search.Operator.IS, myCode]
			];

			// Here we declare our columns/results columns,we just reference them by the internal ID.
			var columns = [
				'itemid',
				'othervendor',
				'vendorcode'
			];

			// Finally we create the search, indicating the type, filters and columns.
			var vendorCodeSearch = search.create({
				type: search.Type.ITEM,
				filters: filters,
				columns : columns
			});

			return getAllResults(vendorCodeSearch);

		}

		function getAllResults(osearch) {
			var all = [];
			var results = [];

			var startIndex = 0;
			var endIndex = 1000;
			var pageSize = 1000;

			do {
				results = osearch.run().getRange({
					start: startIndex,
					end: endIndex
				});

				all = all.concat(results);

				startIndex += pageSize;
				endIndex += pageSize;
			} while (results.length === pageSize);

			return all;
		}

		function resultToObject(result) {
			return {
				item: result.getValue({name:'itemid'}),
				vendor: result.getValue({name:'othervendor'}),
				code: result.getValue({name:'vendorcode'})
			};
		}

		function translate(results) {
			return results.map(resultToObject);
		}

		return {
			pageInit: pageInit,
			validateField: validateField,
			saveRecord: saveRecord,
			fieldChanged: fieldChanged
		};
	}
);