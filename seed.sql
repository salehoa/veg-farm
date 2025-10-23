-- Sample products (منتجات تجريبية)
INSERT OR IGNORE INTO products (name_ar, name_en, description, price, unit, quantity, status) VALUES 
  ('طماطم', 'Tomatoes', 'طماطم طازجة من المزرعة', 5.5, 'كرتون', 100, 'available'),
  ('خيار', 'Cucumber', 'خيار طازج وممتاز', 4.0, 'كرتون', 80, 'available'),
  ('باذنجان', 'Eggplant', 'باذنجان بنفسجي', 3.5, 'كرتون', 60, 'available'),
  ('فلفل أخضر', 'Green Pepper', 'فلفل أخضر حار', 6.0, 'كرتون', 50, 'available'),
  ('بطاطس', 'Potatoes', 'بطاطس محلية', 7.0, 'كرتون', 120, 'available'),
  ('جزر', 'Carrots', 'جزر برتقالي طازج', 4.5, 'كرتون', 70, 'available'),
  ('كوسة', 'Zucchini', 'كوسة خضراء', 3.0, 'كرتون', 40, 'available'),
  ('بصل', 'Onions', 'بصل محلي', 5.0, 'كرتون', 90, 'available');

-- Sample shop users (محلات تجريبية)
INSERT OR IGNORE INTO users (username, password, name, role, phone, address, status) VALUES 
  ('shop1', 'shop123', 'محل الخضروات الطازجة', 'shop', '91111111', 'مسقط - الخوير', 'active'),
  ('shop2', 'shop123', 'سوق الخضروات المركزي', 'shop', '92222222', 'مسقط - روي', 'active'),
  ('shop3', 'shop123', 'متجر الزراعة النقية', 'shop', '93333333', 'صحار', 'active');
