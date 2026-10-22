import pandas as pd
from surprise import Dataset, Reader, SVD
from surprise.model_selection import cross_validate

# =====================================================================
# 1. CARGAR LOS DATOS DE TU EXCEL
# =====================================================================
# Cambia 'mis_destinos.xlsx' por el nombre real de tu archivo
archivo_excel = 'dataset.xlsx' 
tabla_destinos = pd.read_excel(archivo_excel)

print(f"--> Dataset cargado con {len(tabla_destinos)} filas.")

# =====================================================================
# 2. CONFIGURAR LA LIBRERÍA SURPRISE
# =====================================================================
# Definimos la escala de tus calificaciones (1 a 5 estrellas)
config_escala = Reader(rating_scale=(1, 5))

# Mapeamos las columnas exactas de tu archivo (user_id, item_id, rating)
datos_surprise = Dataset.load_from_df(tabla_destinos[['user_id', 'item_id', 'rating']], config_escala)

# =====================================================================
# 3. EJECUTAR EVALUACIÓN CIENTÍFICA (SVD)
# =====================================================================
print("[INFO] Calculando métricas de rendimiento RMSE y MAE...\n")

# Instanciamos el algoritmo matemático SVD
modelo_svd = SVD()

# Ejecutamos la validación cruzada automática
resultados = cross_validate(
    modelo_svd, 
    datos_surprise, 
    measures=['RMSE', 'MAE'], 
    cv=5, 
    verbose=True
)

# =====================================================================
# 4. RESULTADOS FINALES PARA LAS TABLAS DE TU TESIS
# =====================================================================
print("\n" + "="*50)
print("             MÉTRICAS FINALES           ")
print("="*50)
promedio_rmse = resultados['test_rmse'].mean()
promedio_mae = resultados['test_mae'].mean()

print(f"🔹 Promedio Final RMSE: {promedio_rmse:.4f}")
print(f"🔹 Promedio Final MAE:  {promedio_mae:.4f}")
print("="*50)