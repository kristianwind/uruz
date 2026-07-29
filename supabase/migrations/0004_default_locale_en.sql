-- English becomes the default language for accounts created from here on.
--
-- Deliberately only the column default: everyone who already chose a language
-- keeps it. Changing existing rows would silently switch the app under the two
-- people who have been using it in Danish.

alter table users alter column locale_pref set default 'en';
