/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */

// NO IN USE, to code GROUP...

define(['N/search','N/ui/message','N/ui/dialog'],
	function(search,message,dialog){

		function pageInit(context){
			
			/* If the user has loaded this page by clicking the "make copy" action on another item */
			if (window.location.href.indexOf('cp=T') > -1) {
				validateVendorCodes(context.currentRecord);
			}

		}
		
		/**
		 * This function updates the vendor purchase price from the cost estimate field when the user
		 * selects the "preferred" check box on the vendor sublist.
		 * 
		 * @param {Object} context
		 * @param {N/currentRecord.CurrentRecord} context.currentRecord 
		 * @param {string} context.sublistId the id of the sublist being edited
		 * @param {string} context.fieldId - the id of the field being changed
		 */
		function updateVendorCost(context) {
			
			if (context.sublistId != 'itemvendor' && context.fieldId == 'preferredvendor') {
				return;
			}
			
			/* {boolean} */
			var preferred = context.currentRecord.getCurrentSublistValue({
				sublistId: 'itemvendor',
				fieldId: 'preferredvendor'
			});
				
			if (!preferred) {
				return;
			}
				
			/* {string} */
			var cost = context.currentRecord.getValue({fieldId: 'costestimate'});
			context.currentRecord.setCurrentSublistValue({
				sublistId: 'itemvendor', 
				fieldId: 'purchaseprice', 
				value: cost
			});
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

					if(vendor && vendorCode && !isIgnored(vendorCode)){
						var vendorDuplicate = translate(findVendorCode(vendor,vendorCode, currentRecord.id));
					}
					
					/* {string|boolean} The itemid of the first duplicate item found (or false if no duplicates exist) */
					var vendorDuplicate = vendorCodeIsDuplicate(vendor, vendorCode, currentRecord.id);

					if (vendorDuplicate){
						
						showDuplicateDialog(vendorCode, vendorText, vendorDuplicate);

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
			
			if (fieldId == 'preferredvendor') {
				updateVendorCost(context);
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

		function findVendorCode(thevendor,thecode, thisItemId){

			var myVendor = thevendor ||'';
			var myCode = thecode || '';

			var filters = [
				['isinactive',search.Operator.IS, 'F'], 'AND',
				['type',search.Operator.ANYOF,["InvtPart","Assembly"]], 'AND',
				['othervendor',search.Operator.ANYOF, myVendor], 'AND',
				['vendorcode',search.Operator.IS, myCode]
			];
			
			/**
			 * If the user is editing this record, the record itself will be reported
			 * as a duplicate unless we eliminate it from the search.
			 */
			if (thisItemId) {
				filters.push('AND');
				filters.push(['internalid', search.Operator.NONEOF, thisItemId]);
			}

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
		
		/**
		 * This function determines if the given vendor code for the given vendor is a duplicate of
		 * another item in the database.
		 * 
		 * @param {string} vendorId - The vendor that uses this code
		 * @param {string} vendorCode - the vendor's part number being validated
		 * @param {string?} itemId - Optional - the current item id, if the user is editing an existing record
		 * @returns {string|boolean} the itemid of the duplicate if this vendor code has already been used for this vendor on another item.
		 */
		function vendorCodeIsDuplicate(vendorId, vendorCode, itemId) {
			
			/* If there is no vendor code or it is one of the ignored values, do not even search. */
          
			if (isIgnored(vendorCode)) {
				return false;
			}
			
			var vendorDuplicate = translate(findVendorCode(vendorId, vendorCode, itemId));
			
			if (vendorDuplicate && vendorDuplicate.length){
				return vendorDuplicate[0].item;
			}
			
			return false;	
		}
		
		/**
		 * This function determines if we need to spend the time and governace to look up
		 * the vendor code.  A specific ignored code exists to prevent validation on a placeholder
		 * value.
		 * 
		 * @param {string} vendorCode - The vendor code to be validated
		 * @returns {boolean} true if we can ignore validation on this vendor code.  False otherwise.
		 */
		function isIgnored(vendorCode) {
			
			/* {string[]} */
			const IGNORED_CODES = ['NA'];
			
			if (!vendorCode || IGNORED_CODES.indexOf(vendorCode) != -1) {
				return true;
			}
			
			return false;
		}
		
		/**
		 * This function shows a dialog to the user when the vendor code is found to be a duplicate.
		 * 
		 * @param {string} vendorCode - The duplicate vendor code
		 * @param {string} vendorText - The vendor's name
		 * @param {string} itemId - The item id that is already using that vendor code for this vendor.
		 */
		function showDuplicateDialog(vendorCode, vendorText, itemId) {
			
			/* {string} The message to display to the user */
			var message ='You can not use the code: ' + vendorCode + ' for Vendor: '
				+ vendorText + ' because that code is already in use on Item: ' + itemId;
			
			dialog.create({
				title: 'Duplicate Vendor Code',
				message: message
			});
		}
		
		/**
		 * This function will loop over vendor lines and detect any duplicate vendor codes, clearing any duplicates
		 * found and displaying a message to the user.
		 * 
		 * @param {N/currentRecord.CurrentRecord} rec
		 */
		function validateVendorCodes(rec) {
			
			var params = {sublistId: 'itemvendor'};
			var vendorCode = '';
			var vendorId = '';
			var lineCount = rec.getLineCount(params);
			var duplicateItem = '';
			var message = [];
			var vendorText = '';
			
			for (var i = 0; i < lineCount; i++) {
				params.line = i;
				params.fieldId = 'vendorcode';
				vendorCode = rec.getSublistValue(params);
				
				params.fieldId = 'vendor';
				vendorId = rec.getSublistValue(params);
				
				duplicateItem = vendorCodeIsDuplicate(vendorId, vendorCode, rec.id);
				
				if (duplicateItem) {
					vendorText = rec.getSublistText(params);
					message.push( 'Vendor code ' + vendorCode + ' is already in use for ' + vendorText + ' on item ' + duplicateItem);
					params.fieldId = 'vendorcode';
					params.value = '';
					rec.selectLine(params);
					rec.setCurrentSublistValue(params);
					rec.commitLine(params);
				}
			}
			
			if (message.length) {
				dialog.create({
					title: (message.length > 1) ? "Duplicate vendor codes found" : "Duplicate vendor code found",
					message: message.join("<br />")
				});
			}	
		}
		

		return {
			pageInit: pageInit,
			validateField: validateField,
			saveRecord: saveRecord,
			fieldChanged: fieldChanged
		};
	}
);