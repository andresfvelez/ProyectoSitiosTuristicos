import numpy as np

# Estructura de entrada: Datos de prueba empíricos recolectados en TurisCol
DATASET_PRUEBA = [
    {
        "id":"aczeCX75ZlRggpOFqC5vcZ93P5r1",
        "arquetipo": "Ecoturismo de Alta Gama / Overland",
        "favoritos_ground_truth": [
            "Reserva Natural Reinita Cielo Azul",
            "Los Sauces",
            "Cañón y Río Nare",
            "Vereda Los Cuervos",
            "San Agustín"
        ],
        "recomendaciones_ia": [
            "Reserva Natural Reinita Cielo Azul",
            "Reserva Natural de Aves Pauxi Pauxi - Predio Buena Vista",
            "Cañón y Río Nare",
            "Vereda Alto Bonito",
            "Vereda Guayabito"
        ]
    },
    {
        "id": "hoF2pExCbWgpdB0NKJ52jHA8MHp2",
        "arquetipo": "Urbano Peatonal y Familiar",
        "favoritos_ground_truth": [
            "Parque Temático Los Maracos",
            "Miravalle",
            "Las Piedras",
            "Balneario Natural Las Manguitas",
            "Corregimiento La Paila"
        ],
        "recomendaciones_ia": [
            "Balneario Natural Las Manguitas",
            "Parque Temático Los Maracos",
            "Corregimiento La Paila",
            "Vereda Bombay",
            "Ciénaga de Betancí"
        ]
    },
    {
        "id": "4idNFjQgZBhyrPPpldoF0f4zn753",
        "arquetipo": "Cultural y Pueblos Andinos",
        "favoritos_ground_truth": [
            "Parque Nacional Natural Los Nevados",
            "Punta Gallinas",
            "Río Guadalajara",
            "Aventura Park Villa de Leyva",
            "Lago de Sochagota y Cuenca Hidrográfica"
        ],
        "recomendaciones_ia": [
            "Lago de Sochagota y Cuenca Hidrográfica",
            "Páramo El Atravesado",
            "Reserva Natural Forestal El Encenillo",
            "Cuenca Alta del Río Zaque",
            "Reserva Natural El Rincón"
        ]
    },
    {
        "id":"G1VRjJEua8b48P3CKKvBnYDZpPR2",
        "arquetipo": "Patrimonio e Historia",
        "favoritos_ground_truth": [
             "Quebradas El Peñón y San Juan",
             "Vereda Guayabito",
             "Verde Esperanza",
             "Vereda Alto Bonito",
             "Vereda San Rafael"
        ],
        "recomendaciones_ia": [
            "Verde Esperanza",
            "Vereda Guayabito",
            "Quebradanegra La Carmencita",
            "Quebradas El Peñón y San Juan",
            "Reserva Natural Horizontes"
        ]
    },
    {
        "id": "7i1W3L3vSeOWmLJJTvtV233zEw82",
        "arquetipo": "Naturaleza Fría y Relax en Pareja",
        "favoritos_ground_truth": [
            "Santa Fe",
            "Plantas Medicinales Orito - Ingi Ande",
            "Vereda Alto Bonito",
            "Ecoparque Mana Dulce",
            "Reserva Natural de Aves Pauxi Pauxi - Predio Buena Vista"
        ],
        "recomendaciones_ia": [
            "Lago de Sochagota y Cuenca Hidrográfica",
            "Reserva Natural Forestal El Encenillo",
            "Páramo El Atravesado",
            "Bosques Andinos Húmedos el Rasgón",
            "Cuenca Alta del Río Zaque"
        ]
    }
]

def normalizar_cadena(texto: str) -> str:
    return texto.strip().lower()

def calcular_metricas_sistema(datos: list, k: int = 5):
    total_usuarios = len(datos)

    vector_precision = np.zeros(total_usuarios, dtype=float)
    vector_recall = np.zeros(total_usuarios, dtype=float)
    vector_f1 = np.zeros(total_usuarios, dtype=float)
    vector_hit_rate = np.zeros(total_usuarios, dtype=int)
    vector_aciertos = np.zeros(total_usuarios, dtype=int)

    reporte_individual = []

    for i, item in enumerate(datos):
        set_ground_truth = {normalizar_cadena(x) for x in item["favoritos_ground_truth"]}
        lista_rec_k = [normalizar_cadena(x) for x in item["recomendaciones_ia"][:k]]
        set_rec_k = set(lista_rec_k)

        # Intersección de conjuntos (A ∩ B)
        interseccion = set_rec_k.intersection(set_ground_truth)
        num_aciertos = len(interseccion)

        # Cálculo por usuario
        precision = num_aciertos / k
        recall = num_aciertos / len(set_ground_truth) if len(set_ground_truth) > 0 else 0.0

        if (precision + recall) > 0:
            f1 = 2 * (precision * recall) / (precision + recall)
        else:
            f1 = 0.0

        hit = 1 if num_aciertos > 0 else 0

        # Asignación a vectores NumPy
        vector_precision[i] = precision
        vector_recall[i] = recall
        vector_f1[i] = f1
        vector_hit_rate[i] = hit
        vector_aciertos[i] = num_aciertos

        reporte_individual.append({
            "arquetipo": item["arquetipo"],
            "interseccion": num_aciertos,
            "precision": precision,
            "recall": recall,
            "f1": f1
        })

    # Reducción estadística global mediante NumPy
    metricas_consolidadas = {
        "k_evaluado": k,
        "total_casos": total_usuarios,
        "precision_media": float(np.mean(vector_precision)),
        "precision_desv": float(np.std(vector_precision)),
        "recall_medio": float(np.mean(vector_recall)),
        "recall_desv": float(np.std(vector_recall)),
        "f1_medio": float(np.mean(vector_f1)),
        "hit_rate_global": float(np.mean(vector_hit_rate)),
        "promedio_aciertos": float(np.mean(vector_aciertos))
    }

    return reporte_individual, metricas_consolidadas

def imprimir_resultados(reporte_ind: list, consolidado: dict):
    print("=" * 85)
    print(f"EVALUACIÓN EXPERIMENTAL DE RECOMENDACIONES (K = {consolidado['k_evaluado']})")
    print("=" * 85)
    print(f"{'Arquetipo':<30} | {'Aciertos':<10} | {'Precision@K':<12} | {'Recall@K':<10} | {'F1-Score':<10}")
    print("-" * 85)

    for r in reporte_ind:
        print(
            f"{r['arquetipo']:<30} | "
            f"{r['interseccion']}/{consolidado['k_evaluado']:<8} | "
            f"{r['precision'] * 100:>10.2f}% | "
            f"{r['recall'] * 100:>8.2f}% | "
            f"{r['f1'] * 100:>8.2f}%"
        )

    print("-" * 85)
    print("MÉTRICAS GLOBALES CONSOLIDADAS (NUMPY):")
    print(f"• Precision@{consolidado['k_evaluado']} Media : {consolidado['precision_media'] * 100:.2f}% (± {consolidado['precision_desv'] * 100:.2f}%)")
    print(f"• Recall@{consolidado['k_evaluado']} Medio   : {consolidado['recall_medio'] * 100:.2f}% (± {consolidado['recall_desv'] * 100:.2f}%)")
    print(f"• F1-Score Promedio : {consolidado['f1_medio'] * 100:.2f}%")
    print(f"• Hit Rate Global   : {consolidado['hit_rate_global'] * 100:.2f}%")
    print(f"• Aciertos Promedio : {consolidado['promedio_aciertos']:.2f} / {consolidado['k_evaluado']} destinos")
    print("=" * 85)

if __name__ == "__main__":
    reporte_ind, consolidado = calcular_metricas_sistema(DATASET_PRUEBA, k=5)
    imprimir_resultados(reporte_ind, consolidado)