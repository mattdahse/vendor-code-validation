# vendor-code-validation

Customer Vendor Code Script Modification:
Client Script: NES IT Handler CS
File: nes_ITEMS_Handler_CS.js
Folder: SuiteScripts > NES IT Handlers

This Client Script make a search when the user input the Vendor Code to verify if the vendor code is not duplicated and it alert the user and clear the field.
- Is working on creation but is not working on record copy, we need it to work on record copy.
- We need to be able to enter an exception to which the rule would not apply the KEYWORD “NA” would be use for entering the Preferred Item Vendor when we are creating an Item and we don’t have the vendor code yet. This should allow duplicates and allow the user to enter it.
- We need to copy the cost from “ITEM DEFINED COST” (Field ID: costestimate) to Vendor Purchase Price.

Note: there would be always at least one Preferred Vendor per Item. In case of multiples the preferred one would be the one updated with this “ITEM DEFINED COST
