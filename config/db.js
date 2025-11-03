import { Sequelize } from 'sequelize'

export const conn = () => {
    const connectionType = 'params'; //connection types - params or uri
    switch(connectionType) {
        case 'params' : {
            return new Sequelize(
                process.env.DB_DATABASE,
                process.env.DB_USERNAME,
                process.env.DB_PASSWORD,
                {
                    host: process.env.DB_HOST,
                    dialect: process.env.DB_DIALECT,
                }
            );
        }
        case 'uri': {
            return new Sequelize(process.env.DB_URL);
        }
    }
}