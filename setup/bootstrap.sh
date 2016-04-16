sudo apt-get update
sudo apt-get install -y \
  sqlite3               \
  git                   \
  uwsgi                 \
  uwsgi-plugin-python3  \
  python3-bottle        \
  nginx

sudo -u vagrant cp /vagrant/setup/sqliterc /home/vagrant/.sqliterc
sudo -u vagrant cp /vagrant/setup/vimrc /home/vagrant/.vimrc

# install tesserae corpus

sudo -u vagrant git clone https://github.com/cwf2/tesscorpus \
  /home/vagrant/tesscorpus

# add the corpus to the database

sudo -u vagrant /vagrant/georgics/bin/ingest.py \
  --db /vagrant/georgics/db/tess.db \
  /home/vagrant/tesscorpus/*.xml

# set up web services

sudo ln -s /vagrant/setup/uwsgi.ini /etc/uwsgi/apps-enabled/text_server.ini
sudo ln -s /vagrant/setup/nginx /etc/nginx/sites-enabled/georgics.tesserae.org
sudo rm /etc/nginx/sites-enabled/default

sudo service uwsgi restart
sudo service nginx restart
