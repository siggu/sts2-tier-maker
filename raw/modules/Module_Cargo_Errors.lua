local p = {}
local cargo = mw.ext.cargo

local function sequelToNamespace(symbol)
	if symbol == "2" or symbol == 2 then
		return 'Slay the Spire 2'
	elseif symbol == "B" then
		return 'Board Game'
	elseif symbol == "1" or symbol == 1 then
		return 'Main'
	else
		return 'Unknown'
	end
end


function findEnemyErrors()
	local output = {}
	
	--check if boss enemy is missing an icon
	local icons = cargo.query('Enemies', 'Link, Name, Game', {
		where = 'Type = "Boss" AND Icon = ""'
	})
	
	for _, enemy in ipairs(icons) do
		table.insert(output, {
			cargoTable = '[[Special:CargoTables/Enemies|Enemies]]',
			link = enemy.Page,
			name = enemy.Name,
			game = enemy.Game,
			issue = 'Boss Enemy is Missing an Icon',
			summary = 'Fix Missing Icon'
		})
	end
	
	return output
	
end

function findRelicErrors()
	local output = {}
	
	--check if Event or Ancient Relic is missing a source
	local sources = cargo.query('Relics', 'Link, Name, Game', {
		where = '(Rarity = "Event" AND EventSource = "-") OR (Rarity = "Ancient" AND AncientSource = "-")'
	})
	
	for _, relic in ipairs(sources) do
		table.insert(output, {
			cargoTable = '[[Special:CargoTables/Relics|Relics]]',
			link = relic.Page,
			name = relic.Name,
			game = relic.Game,
			issue = 'Event or Ancient relic Missing a Source',
			summary = 'Fix Missing Source'
		})
	end
	
	return output
end

function findCardErrors()
	local output = {}
	
	--check if Description has characters from lua module or that might cause issues
	for _, card in ipairs(cargo.query('Cards', 'Link, Name, Game', {
		where = 'Description LIKE "%$%" OR Description LIKE "%&%"'
		-- OR Description LIKE "%@%"' -> waiting for Icon Template restructure
	})) do
		table.insert(output, {
			cargoTable = '[[Special:CargoTables/Cards|Cards]]',
			link = card.Link,
			name = card.Name,
			game = card.Game,
			issue = 'Card has bad characters in Description',
			summary = 'Fix Description'
		})
	end
	
	--check if all cardArt images exist
	local function checkImages(imagetype)
		for _, card in ipairs(cargo.query('CardArt, _pageData', 'CardArt.Link=Link, CardArt.Name=Name, CardArt.Game=Game, _pageData._numRevisions=Num, CardArt.'..imagetype..'=Image', {where = 'CardArt.'..imagetype..' IS NOT NULL', join = 'CardArt.'..imagetype..'=_pageData._pageTitle'}) or {}) do
			if not card.Num then
				table.insert(output, {
					cargoTable = '[[Special:CargoTables/CardArt|CardArt]]',
					link = card.Link,
					name = card.Name,
					game = card.Game,
					issue = 'Card is missing a file for '..imagetype,
					summary = 'Fix Missing image'
				})
			end
		end
	end
	
	checkImages('Icon')
	checkImages('Art')
	checkImages('BetaArt')
	checkImages('FullCard')
	checkImages('FullCardPlus')
	checkImages('FullCardBeta')
	checkImages('FullCardBetaPlus')
	
	return output
end

function findPowerErrors()
	local output = {}
	
	--check if Link has characters from lua module or that might cause issues
	for _, power in ipairs(cargo.query('Powers', 'Link, Name, Game', {
		where = 'ObtainableBy HOLDS "-"'
	})) do
		table.insert(output, {
			cargoTable = '[[Special:CargoTables/Powers|Powers]]',
			link = power.Link,
			name = power.Name,
			game = power.Game,
			issue = 'Power is Missing Source',
			summary = 'Set Power Source'
		})
	end
	
	return output
end

function findSortingErrors()
	local output = {}
	
	local sortingTables = cargo.query('SortingOrder', 'Field, Name') or {}
	
	local entryTypes = {}
	for _, entry in ipairs(sortingTables) do
		if not entryTypes[entry.Field] then
			entryTypes[entry.Field] = {}
		end
		table.insert(entryTypes[entry.Field], entry.Name)
	end
	
	local function sortingWhere(conditions, field)
	    return 'NOT (' .. field .. '="' .. table.concat(conditions, '" OR ' .. field .. '="') .. '")'
	end
	
	local function checkValues(tableType, sortingValue, tableValue)
		if not tableValue then
			tableValue = sortingValue
		end
		for _, entry in ipairs(( cargo.query(tableType, '_pageName=Link, Name, Game,'..tableValue, {where = sortingWhere(entryTypes[sortingValue], tableValue)}) ) or {}) do
			table.insert(output, {
				cargoTable = '[[Special:CargoTables/SortingOrder|SortingOrder]]',
				link = entry.Link,
				name = entry.Name,
				game = entry.Game,
				issue = entry[tableValue]..' '..sortingValue..' entry missing for sorting',
				summary = 'Fix Invalid Value'
			})
		end
	end

	-- Rarity Check
	checkValues('Cards', 'Rarity')
	checkValues('Relics', 'Rarity')
	checkValues('Potions', 'Rarity')
	
	-- Type Check
	checkValues('Cards', 'Type')
	
	-- Color Check
	checkValues('Cards', 'Color')
	
	-- Cost Check
	checkValues('Cards', 'Cost')
	checkValues('Cards', 'Cost', 'CostPlus')
	checkValues('Cards', 'Cost', 'StarCost')
	
	-- Character Check
	checkValues('Relics', 'Character', 'ExclusiveTo')
	checkValues('Potions', 'Character', 'ExclusiveTo')
	
	-- Source Check
	checkValues('Relics', 'Source', 'AncientSource')
	
	-- Act Check
	checkValues('Enemies', 'Act', 'Debut')
	checkValues('Encounters', 'Act')
	
	-- EnemyType Check
	checkValues('Enemies', 'EnemyType', 'Type')

	--PowerType Check
	checkValues('Powers', 'PowerType', 'Type')
	
	return output
end

function findSourcesErrors()
	local output = {}
	
	--Intent subsources check
	for _, entry in ipairs(( cargo.query('KeywordPowerSources', '_pageName=Link, Name, Game', {where = 'Type="Intent" AND SubName = ""', orderBy = '_pageName ASC'}) ) or {}) do
		table.insert(output, {
			cargoTable = '[[Special:CargoTables/KeywordPowerSources|KeywordPowerSources]]',
			link = entry.Link,
			name = entry.Name,
			game = entry.Game,
			issue = entry.Name..'is Missing a Sub Source',
			summary = 'Fix Missing Intent Enemy'
		})
	end
	
	--Target check
	for _, entry in ipairs(( cargo.query('KeywordPowerSources', '_pageName=Link, Name, Game, ID, Type', {where = 'Target="None"', limit = 10000}) ) or {}) do
		table.insert(output, {
			cargoTable = '[[Special:CargoTables/KeywordPowerSources|KeywordPowerSources]]',
			link = entry.Link,
			name = entry.Name,
			game = entry.Game,
			issue = entry.Name..' '..entry.Type..' is missing keyword Target for '..entry.ID,
			summary = 'Fix Missing Keyword Targets'
		})
	end
	
	return output
end

-- [[Template:Cargo Errors]]
function p.main(frame)
	local errors = {}
	
	for _, i in ipairs(findEnemyErrors()) do
		table.insert(errors, i)
	end

    for _, i in ipairs(findRelicErrors()) do
		table.insert(errors, i)
    end
    
    for _, i in ipairs(findCardErrors()) do
		table.insert(errors, i)
    end
    
    for _, i in ipairs(findPowerErrors()) do
		table.insert(errors, i)
    end
    
    for _, i in ipairs(findSortingErrors()) do
		table.insert(errors, i)
    end
    
    for _, i in ipairs(findSourcesErrors()) do
    	table.insert(errors, i)
    end
	
	local countUnique = 0
	local uniqueList = {}
	local output = {}
	
	for _, error in ipairs(errors) do
		local link = string.gsub(error.link or '', ' ', '_')
		link = string.gsub(link, '%?', '%%3F')
		local editLink = 'https://slaythespire.wiki.gg/wiki/'..link..'?action=edit&summary='..string.gsub(error.summary or '', ' ', '&#32;')
		table.insert(output, '\n|-\n||'..error.cargoTable..'||'..sequelToNamespace(error.game)..'||[['..error.link..'|'..error.name..']] (['..editLink..' edit])||'..error.issue)
		if not uniqueList[error.link] then
			countUnique = countUnique + 1
			uniqueList[error.link] = true
		end
	end
	
	
	if #output > 0 then
		return '! colspan="4"|Found '..#output..' Errors'..' on '..countUnique..' pages'..table.concat(output)
	end
	return '!colspan="4"|No Errors Found'
end

return p